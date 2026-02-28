/**
 * 강도 감소 (Strength Reduction)
 * 비싼 연산을 더 싼 연산으로 치환
 * 예: i * 2 → i << 1, i * 0 → 0, i + 0 → i
 */

import { ASTNode, OptimizationResult } from '../types';

export class StrengthReducer {
  private reducedCount = 0;

  /**
   * 이진 연산 강도 감소
   */
  private reduceBinaryOp(node: ASTNode): ASTNode | null {
    const op = node.value as string;
    const left = node.left;
    const right = node.right;

    // 곱셈 강도 감소
    if (op === '*') {
      // i * 0 → 0
      if (right?.type === 'number' && right.value === 0) {
        this.reducedCount++;
        return { type: 'number', value: 0 };
      }
      if (left?.type === 'number' && left.value === 0) {
        this.reducedCount++;
        return { type: 'number', value: 0 };
      }

      // i * 1 → i
      if (right?.type === 'number' && right.value === 1) {
        this.reducedCount++;
        return left || null;
      }
      if (left?.type === 'number' && left.value === 1) {
        this.reducedCount++;
        return right || null;
      }

      // i * 2^n → i << n (2의 거듭제곱)
      if (right?.type === 'number' && this.isPowerOfTwo(right.value)) {
        const shift = Math.log2(right.value);
        this.reducedCount++;
        return left ? {
          type: 'binaryOp',
          value: '<<',
          left,
          right: { type: 'number', value: shift }
        } : null;
      }
    }

    // 나눗셈 강도 감소
    if (op === '/') {
      // i / 1 → i
      if (right?.type === 'number' && right.value === 1) {
        this.reducedCount++;
        return left || null;
      }

      // i / 2^n → i >> n (2의 거듭제곱)
      if (right?.type === 'number' && this.isPowerOfTwo(right.value)) {
        const shift = Math.log2(right.value);
        this.reducedCount++;
        return left ? {
          type: 'binaryOp',
          value: '>>',
          left,
          right: { type: 'number', value: shift }
        } : null;
      }
    }

    // 덧셈 강도 감소
    if (op === '+') {
      // i + 0 → i
      if (right?.type === 'number' && right.value === 0) {
        this.reducedCount++;
        return left || null;
      }
      if (left?.type === 'number' && left.value === 0) {
        this.reducedCount++;
        return right || null;
      }
    }

    // 뺄셈 강도 감소
    if (op === '-') {
      // i - 0 → i
      if (right?.type === 'number' && right.value === 0) {
        this.reducedCount++;
        return left || null;
      }

      // 0 - i → -i
      if (left?.type === 'number' && left.value === 0) {
        this.reducedCount++;
        return right ? {
          type: 'unaryOp',
          value: '-',
          left: right
        } : null;
      }
    }

    return null;
  }

  /**
   * 2의 거듭제곱 확인
   */
  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * 루프 유도 변수 강도 감소
   * for (i = 0; i < n; i++) { x = i * c; }
   * → for (i = 0; i < n; i++) { x = x + c; } (부동 소수점 제외)
   */
  private reduceInductionVariable(node: ASTNode): ASTNode {
    if (node.type === 'forLoop') {
      const loopVar = node.left?.value as string;
      const body = node.children?.[0] || node.right;

      if (loopVar && body) {
        this.analyzeInduction(body, loopVar);
      }
    }

    return node;
  }

  /**
   * 루프 내 귀납 변수 분석
   */
  private analyzeInduction(node: ASTNode, loopVar: string): void {
    if (!node) return;

    // 할당: x = loopVar * c → 덧셈으로 변환 가능
    if (node.type === 'assignment' && node.right?.type === 'binaryOp') {
      const binOp = node.right;
      if (binOp.value === '*') {
        if (binOp.left?.type === 'variable' && binOp.left.value === loopVar &&
            binOp.right?.type === 'number') {
          // 강도 감소 마킹
          if (!node.metadata) node.metadata = {};
          node.metadata.canReduceInduction = true;
          this.reducedCount++;
        }
      }
    }

    if (node.left) this.analyzeInduction(node.left, loopVar);
    if (node.right) this.analyzeInduction(node.right, loopVar);
    if (node.children) {
      node.children.forEach(child => this.analyzeInduction(child, loopVar));
    }
  }

  /**
   * 최적화 적용
   */
  private optimize(node: ASTNode): ASTNode {
    if (!node) return node;

    // 자식 노드 먼저 처리
    if (node.left) node.left = this.optimize(node.left);
    if (node.right) node.right = this.optimize(node.right);
    if (node.children) {
      node.children = node.children.map(child => this.optimize(child));
    }

    // 이진 연산 강도 감소
    if (node.type === 'binaryOp') {
      const reduced = this.reduceBinaryOp(node);
      if (reduced) {
        reduced.metadata = { optimized: 'strength-reduced' };
        return reduced;
      }
    }

    // 루프 유도 변수 강도 감소
    if (node.type === 'forLoop' || node.type === 'whileLoop') {
      this.reduceInductionVariable(node);
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  run(ast: ASTNode): OptimizationResult {
    this.reducedCount = 0;
    const optimized = this.optimize(ast);

    return {
      optimized: this.reducedCount > 0,
      ast: optimized,
      improvement: Math.min(this.reducedCount * 7, 100),
      reductions: { strengthReduction: this.reducedCount }
    };
  }
}
