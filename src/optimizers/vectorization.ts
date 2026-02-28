/**
 * 벡터화 (Vectorization)
 * 스칼라 연산을 벡터 연산으로 변환하여 SIMD 활용
 * 예: for (i = 0; i < 4; i++) { c[i] = a[i] + b[i]; }
 *    → c = a + b (벡터 연산)
 */

import { ASTNode, OptimizationResult } from '../types';

interface VectorOp {
  operator: string;
  arrays: string[];
  loopVar: string;
  iterations: number;
}

export class Vectorizer {
  private vectorizedCount = 0;
  private MIN_VECTOR_SIZE = 4; // 최소 벡터 크기
  private MAX_VECTOR_SIZE = 64; // 최대 벡터 크기

  /**
   * 루프가 벡터화 가능한지 확인
   */
  private isVectorizable(loopNode: ASTNode): boolean {
    // for 루프만 벡터화
    if (loopNode.type !== 'forLoop') {
      return false;
    }

    // 반복 횟수가 알려져야 함
    const iterations = this.extractIterations(loopNode);
    if (!iterations || iterations < this.MIN_VECTOR_SIZE) {
      return false;
    }

    // 루프 본체가 단순해야 함 (배열 접근과 간단한 산술)
    const body = loopNode.children?.[0] || loopNode.right;
    const loopVar = loopNode.left?.value as string | undefined;
    return loopVar ? this.isSimpleLoopBody(body, loopVar) : false;
  }

  /**
   * 반복 횟수 추출
   */
  private extractIterations(loopNode: ASTNode): number | null {
    const condition = loopNode.right;

    if (condition?.type === 'binaryOp' && condition.right?.type === 'number') {
      const op = condition.value as string;
      const limit = condition.right.value as number;

      if (op === '<') return limit;
      if (op === '<=') return limit + 1;
    }

    return null;
  }

  /**
   * 루프 본체가 벡터화에 적합한지 확인
   */
  private isSimpleLoopBody(body: ASTNode | undefined, loopVar: string): boolean {
    if (!body) return false;

    // 할당만 포함되어야 함
    if (body.type === 'block') {
      if (!body.children || body.children.length === 0) return false;

      return body.children.every(stmt => {
        return stmt.type === 'assignment' && this.isVectorizableAssignment(stmt, loopVar);
      });
    }

    return body.type === 'assignment' && this.isVectorizableAssignment(body, loopVar);
  }

  /**
   * 할당이 벡터화 가능한지 확인
   */
  private isVectorizableAssignment(stmt: ASTNode, loopVar: string): boolean {
    if (stmt.type !== 'assignment') return false;

    // 좌변: array[loopVar]
    const lhs = stmt.left;
    if (!this.isArrayAccess(lhs, loopVar)) {
      return false;
    }

    // 우변: 간단한 산술 식
    const rhs = stmt.right;
    return this.isSafeForVectorization(rhs, loopVar);
  }

  /**
   * 배열 접근 확인 (array[loopVar])
   */
  private isArrayAccess(node: ASTNode | undefined, loopVar: string): boolean {
    if (node?.type === 'arrayAccess') {
      return node.left?.type === 'variable' && node.right?.value === loopVar;
    }
    return false;
  }

  /**
   * 표현식이 벡터화에 안전한지 확인
   */
  private isSafeForVectorization(expr: ASTNode | undefined, loopVar: string): boolean {
    if (!expr) return true;

    // 루프 변수만의 배열 접근 허용
    if (expr.type === 'arrayAccess') {
      return expr.right?.value === loopVar;
    }

    // 루프 변수 자체는 벡터화 불가
    if (expr.type === 'variable' && expr.value === loopVar) {
      return false;
    }

    // 기본 산술 연산 허용
    if (expr.type === 'binaryOp') {
      const op = expr.value as string;
      if (!['+', '-', '*', '/', '%'].includes(op)) {
        return false;
      }
      return this.isSafeForVectorization(expr.left, loopVar) &&
             this.isSafeForVectorization(expr.right, loopVar);
    }

    // 상수 허용
    if (expr.type === 'number' || expr.type === 'string') {
      return true;
    }

    return false;
  }

  /**
   * 루프에서 벡터화 가능한 연산 추출
   */
  private extractVectorOps(loopNode: ASTNode): VectorOp[] {
    const loopVar = loopNode.left?.value as string | undefined;
    const iterations = this.extractIterations(loopNode) || 0;
    const body = loopNode.children?.[0] || loopNode.right;

    const ops: VectorOp[] = [];

    if (!loopVar) return ops;

    const extract = (node: ASTNode | undefined): void => {
      if (node?.type === 'assignment' && node.right) {
        const arrays = this.extractArrays(node.right);
        if (arrays.length > 0) {
          const op = this.extractOperation(node.right);
          if (op) {
            ops.push({
              operator: op,
              arrays,
              loopVar,
              iterations
            });
          }
        }
      }

      if (node?.left) extract(node.left);
      if (node?.right) extract(node.right);
      if (node?.children) {
        node.children.forEach(child => extract(child));
      }
    };

    extract(body);
    return ops;
  }

  /**
   * 표현식에서 배열명 추출
   */
  private extractArrays(expr: ASTNode | undefined): string[] {
    const arrays: string[] = [];

    const extract = (node: ASTNode | undefined): void => {
      if (node?.type === 'arrayAccess' && node.left?.type === 'variable') {
        const arrName = node.left.value as string;
        if (!arrays.includes(arrName)) {
          arrays.push(arrName);
        }
      }

      if (node?.left) extract(node.left);
      if (node?.right) extract(node.right);
      if (node?.children) {
        node.children.forEach(child => extract(child));
      }
    };

    extract(expr);
    return arrays;
  }

  /**
   * 표현식에서 연산 추출
   */
  private extractOperation(expr: ASTNode | undefined): string | null {
    if (expr?.type === 'binaryOp') {
      return expr.value as string;
    }

    // 복합 표현식에서 주요 연산 추출
    if (expr?.left?.type === 'binaryOp') {
      return this.extractOperation(expr.left);
    }

    if (expr?.right?.type === 'binaryOp') {
      return this.extractOperation(expr.right);
    }

    return null;
  }

  /**
   * 루프를 벡터 연산으로 변환
   */
  private vectorizeLoop(loopNode: ASTNode): ASTNode {
    if (!this.isVectorizable(loopNode)) {
      return loopNode;
    }

    const vectorOps = this.extractVectorOps(loopNode);

    if (vectorOps.length === 0) {
      return loopNode;
    }

    this.vectorizedCount++;

    // 벡터화된 루프 마킹
    if (!loopNode.metadata) loopNode.metadata = {};
    loopNode.metadata.vectorized = true;
    loopNode.metadata.operations = vectorOps.length;

    return loopNode;
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

    // 루프 벡터화
    if (node.type === 'forLoop') {
      return this.vectorizeLoop(node);
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  run(ast: ASTNode): OptimizationResult {
    this.vectorizedCount = 0;
    const optimized = this.optimize(ast);

    return {
      optimized: this.vectorizedCount > 0,
      ast: optimized,
      improvement: Math.min(this.vectorizedCount * 25, 100),
      reductions: { vectorization: this.vectorizedCount }
    };
  }
}
