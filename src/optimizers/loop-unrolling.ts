/**
 * 루프 펼침 (Loop Unrolling)
 * 루프 반복을 펼쳐서 분기 및 루프 오버헤드 감소
 * 예: for (i = 0; i < 8; i++) { sum += a[i]; }
 *    → sum += a[0]; sum += a[1]; ... sum += a[7];
 */

import { ASTNode, OptimizationResult } from '../types';

export class LoopUnroller {
  private unrolledCount = 0;
  private MAX_UNROLL_FACTOR = 8; // 최대 펼침 수
  private MAX_BODY_SIZE = 20; // 루프 본체 복잡도 제한

  /**
   * 루프 본체의 복잡도 계산
   */
  private calculateBodyComplexity(body: ASTNode): number {
    if (!body) return 0;

    let complexity = 1;

    if (body.left) complexity += this.calculateBodyComplexity(body.left);
    if (body.right) complexity += this.calculateBodyComplexity(body.right);
    if (body.children) {
      complexity += body.children.reduce((sum, child) => sum + this.calculateBodyComplexity(child), 0);
    }

    return complexity;
  }

  /**
   * 루프 카운트 추출 (정적으로 알려진 경우)
   */
  private extractLoopCount(loopNode: ASTNode): number | null {
    // for (i = 0; i < N; i++) 형태에서 N 추출
    if (loopNode.type === 'forLoop') {
      // 조건에서 상수 추출
      const condition = loopNode.right;
      if (condition?.type === 'binaryOp' && condition.right?.type === 'number') {
        const operator = condition.value as string;
        const limit = condition.right.value as number;

        if (operator === '<') return limit;
        if (operator === '<=') return limit + 1;
        if (operator === '>') return Math.max(0, limit - 1);
        if (operator === '>=') return Math.max(0, limit);
      }
    }

    return null;
  }

  /**
   * 루프 변수 추출
   */
  private extractLoopVariable(loopNode: ASTNode): string | null {
    if (loopNode.type === 'forLoop' && loopNode.left?.type === 'variable') {
      return loopNode.left.value as string;
    }
    return null;
  }

  /**
   * 반복 횟수별 펼침 인수 결정
   */
  private determineUnrollFactor(loopCount: number, bodyComplexity: number): number {
    // 루프 본체가 너무 복잡하면 펼치지 않음
    if (bodyComplexity > this.MAX_BODY_SIZE) {
      return 1;
    }

    // 반복 횟수가 너무 많으면 펼침 인수 감소
    const baseUnrollFactor = Math.max(1, this.MAX_UNROLL_FACTOR / Math.ceil(bodyComplexity / 5));

    // 반복 횟수에 맞게 조정
    return Math.min(baseUnrollFactor, loopCount);
  }

  /**
   * 루프 변수 치환 (복사본 생성)
   */
  private cloneAndSubstitute(body: ASTNode, loopVar: string, iteration: number): ASTNode {
    const clone = this.cloneNode(body);

    const substitute = (node: ASTNode): ASTNode => {
      if (node.type === 'variable' && node.value === loopVar) {
        return { type: 'number', value: iteration };
      }

      if (node.type === 'binaryOp') {
        if (node.left?.type === 'variable' && node.left.value === loopVar) {
          const result = this.evaluateBinary(node.value as string, iteration, node.right?.value);
          if (typeof result === 'number') {
            return { type: 'number', value: result };
          }
        }
      }

      if (node.left) node.left = substitute(node.left);
      if (node.right) node.right = substitute(node.right);
      if (node.children) {
        node.children = node.children.map(child => substitute(child));
      }

      return node;
    };

    return substitute(clone);
  }

  /**
   * 이진 연산 평가
   */
  private evaluateBinary(op: string, left: number, right: any): number | null {
    switch (op) {
      case '+': return left + (right as number);
      case '-': return left - (right as number);
      case '*': return left * (right as number);
      case '/': return left / (right as number);
      case '%': return left % (right as number);
      case '&': return left & (right as number);
      case '|': return left | (right as number);
      case '^': return left ^ (right as number);
      default: return null;
    }
  }

  /**
   * 노드 깊은 복사
   */
  private cloneNode(node: ASTNode): ASTNode {
    return {
      type: node.type,
      value: node.value,
      left: node.left ? this.cloneNode(node.left) : undefined,
      right: node.right ? this.cloneNode(node.right) : undefined,
      children: node.children ? node.children.map(c => this.cloneNode(c)) : undefined,
      metadata: node.metadata ? { ...node.metadata } : undefined
    };
  }

  /**
   * 루프 펼침 적용
   */
  private unrollLoop(loopNode: ASTNode): ASTNode {
    const loopCount = this.extractLoopCount(loopNode);
    const loopVar = this.extractLoopVariable(loopNode);
    const body = loopNode.children?.[0] || loopNode.right;

    if (!loopCount || !loopVar || !body || loopCount < 2) {
      return loopNode;
    }

    const bodyComplexity = this.calculateBodyComplexity(body);
    const unrollFactor = this.determineUnrollFactor(loopCount, bodyComplexity);

    if (unrollFactor <= 1) {
      return loopNode;
    }

    // 펼쳐진 루프 생성
    const unrolledBodies: ASTNode[] = [];

    for (let i = 0; i < loopCount; i += unrollFactor) {
      for (let j = 0; j < unrollFactor && i + j < loopCount; j++) {
        const substituted = this.cloneAndSubstitute(body, loopVar, i + j);
        unrolledBodies.push(substituted);
      }
    }

    this.unrolledCount++;

    // 블록으로 래핑
    return {
      type: 'block',
      children: unrolledBodies,
      metadata: {
        unrolled: true,
        factor: unrollFactor,
        originalLoop: loopNode
      }
    };
  }

  /**
   * 최적화 적용
   */
  private applyUnrolling(node: ASTNode): ASTNode {
    if (!node) return node;

    // 자식 노드 먼저 처리
    if (node.left) node.left = this.applyUnrolling(node.left);
    if (node.right) node.right = this.applyUnrolling(node.right);
    if (node.children) {
      node.children = node.children.map(child => this.applyUnrolling(child));
    }

    // 루프 펼침
    if (node.type === 'forLoop' || node.type === 'whileLoop') {
      return this.unrollLoop(node);
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  optimize(ast: ASTNode): OptimizationResult {
    this.unrolledCount = 0;
    const optimized = this.applyUnrolling(ast);

    return {
      optimized: this.unrolledCount > 0,
      ast: optimized,
      improvement: Math.min(this.unrolledCount * 15, 100),
      reductions: { loopUnroll: this.unrolledCount }
    };
  }
}
