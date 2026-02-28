/**
 * 상수 접기 (Constant Folding)
 * 컴파일 타임에 상수 표현식을 계산하여 최적화
 * 예: 5 + 3 → 8
 */

import { ASTNode, OptimizationResult } from '../types';

export class ConstantFolder {
  private foldCount = 0;

  /**
   * 상수 식인지 판단
   */
  private isConstant(node: ASTNode): boolean {
    if (node.type === 'number' || node.type === 'string' || node.type === 'boolean') {
      return true;
    }
    if (node.type === 'binaryOp') {
      return this.isConstant(node.left!) && this.isConstant(node.right!);
    }
    if (node.type === 'unaryOp') {
      return this.isConstant(node.left!);
    }
    return false;
  }

  /**
   * 이진 연산 평가
   */
  private evaluateBinary(op: string, left: any, right: any): any {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '&&': return left && right;
      case '||': return left || right;
      case '&': return left & right;
      case '|': return left | right;
      case '^': return left ^ right;
      default: return null;
    }
  }

  /**
   * 단항 연산 평가
   */
  private evaluateUnary(op: string, operand: any): any {
    switch (op) {
      case '-': return -operand;
      case '!': return !operand;
      case '~': return ~operand;
      default: return null;
    }
  }

  /**
   * 노드 값 가져오기
   */
  private getValue(node: ASTNode): any {
    if (node.type === 'number' || node.type === 'string' || node.type === 'boolean') {
      return node.value;
    }
    if (node.type === 'binaryOp') {
      const left = this.getValue(node.left!);
      const right = this.getValue(node.right!);
      return this.evaluateBinary(node.value as string, left, right);
    }
    if (node.type === 'unaryOp') {
      const operand = this.getValue(node.left!);
      return this.evaluateUnary(node.value as string, operand);
    }
    return null;
  }

  /**
   * AST 트리 변환
   */
  private transform(node: ASTNode): ASTNode {
    if (!node) return node;

    // 자식 노드 먼저 변환
    if (node.left) node.left = this.transform(node.left);
    if (node.right) node.right = this.transform(node.right);
    if (node.children) {
      node.children = node.children.map(child => this.transform(child));
    }

    // 상수 식 계산
    if ((node.type === 'binaryOp' || node.type === 'unaryOp') && this.isConstant(node)) {
      const value = this.getValue(node);
      this.foldCount++;

      // 상수 리터럴 노드로 변환
      return {
        type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
        value,
        metadata: { optimized: 'constant-folded' }
      };
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  optimize(ast: ASTNode): OptimizationResult {
    this.foldCount = 0;
    const optimized = this.transform(ast);

    return {
      optimized: this.foldCount > 0,
      ast: optimized,
      improvement: Math.min(this.foldCount * 5, 100),
      reductions: { constantFolding: this.foldCount }
    };
  }
}
