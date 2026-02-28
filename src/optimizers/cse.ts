/**
 * 공통 부분식 제거 (Common Subexpression Elimination - CSE)
 * 동일한 표현식을 한 번만 계산하고 결과를 재사용
 * 예: a = x + y; b = x + y; → a = x + y; b = a;
 */

import { ASTNode, OptimizationResult } from '../types';

interface ExpressionMap {
  [key: string]: { node: ASTNode; count: number };
}

export class CSEOptimizer {
  private expressionMap: ExpressionMap = {};
  private eliminatedCount = 0;

  /**
   * 표현식의 정규화된 문자열 표현
   */
  private normalizeExpression(node: ASTNode): string {
    if (node.type === 'number' || node.type === 'string' || node.type === 'boolean') {
      return `${node.type}:${node.value}`;
    }
    if (node.type === 'variable') {
      return `var:${node.value}`;
    }
    if (node.type === 'binaryOp') {
      const left = this.normalizeExpression(node.left!);
      const right = this.normalizeExpression(node.right!);
      // 교환법칙이 성립하는 연산은 정규화
      if (['+', '*', '&', '|', '^'].includes(node.value as string)) {
        const [a, b] = [left, right].sort();
        return `binop:${node.value}(${a},${b})`;
      }
      return `binop:${node.value}(${left},${right})`;
    }
    if (node.type === 'unaryOp') {
      const operand = this.normalizeExpression(node.left!);
      return `unaryop:${node.value}(${operand})`;
    }
    if (node.type === 'functionCall') {
      const args = node.children?.map(c => this.normalizeExpression(c)).join(',') || '';
      return `call:${node.value}(${args})`;
    }
    return 'unknown';
  }

  /**
   * 표현식이 안전하게 재사용 가능한지 확인
   * (부작용이 없는지 확인)
   */
  private isSafeToReuse(node: ASTNode): boolean {
    if (node.type === 'functionCall') {
      // 순수 함수만 재사용 가능
      const pureFunctions = ['abs', 'sqrt', 'sin', 'cos', 'floor', 'ceil'];
      return pureFunctions.includes(node.value as string);
    }
    if (node.type === 'binaryOp' || node.type === 'unaryOp') {
      return true;
    }
    if (node.type === 'variable') {
      return true;
    }
    return false;
  }

  /**
   * AST 트리를 방문하며 공통 표현식 수집
   */
  private collectExpressions(node: ASTNode): void {
    if (!node) return;

    if (this.isSafeToReuse(node) && node.type !== 'variable' && node.type !== 'number' &&
        node.type !== 'string' && node.type !== 'boolean') {
      const normalized = this.normalizeExpression(node);

      if (this.expressionMap[normalized]) {
        this.expressionMap[normalized].count++;
      } else {
        this.expressionMap[normalized] = { node, count: 1 };
      }
    }

    if (node.left) this.collectExpressions(node.left);
    if (node.right) this.collectExpressions(node.right);
    if (node.children) {
      node.children.forEach(child => this.collectExpressions(child));
    }
  }

  /**
   * 공통 표현식이 제거된 새 노드 생성
   */
  private replaceCommonExpressions(node: ASTNode, varCounter: { count: number }): ASTNode {
    if (!node) return node;

    // 자식 노드 먼저 처리
    if (node.left) node.left = this.replaceCommonExpressions(node.left, varCounter);
    if (node.right) node.right = this.replaceCommonExpressions(node.right, varCounter);
    if (node.children) {
      node.children = node.children.map(child => this.replaceCommonExpressions(child, varCounter));
    }

    // 2회 이상 나타나는 표현식을 임시 변수로 치환
    if (this.isSafeToReuse(node) && node.type !== 'variable' && node.type !== 'number' &&
        node.type !== 'string' && node.type !== 'boolean') {
      const normalized = this.normalizeExpression(node);

      if (this.expressionMap[normalized] && this.expressionMap[normalized].count > 1) {
        if (!node.metadata?.replaced) {
          const tempVar = `__cse_${varCounter.count++}`;
          node.metadata = node.metadata || {};
          node.metadata.tempVar = tempVar;
          node.metadata.replaced = true;
          this.eliminatedCount++;
        }
      }
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  optimize(ast: ASTNode): OptimizationResult {
    this.expressionMap = {};
    this.eliminatedCount = 0;

    // 공통 표현식 수집
    this.collectExpressions(ast);

    // 공통 표현식 제거
    const varCounter = { count: 0 };
    const optimized = this.replaceCommonExpressions(ast, varCounter);

    return {
      optimized: this.eliminatedCount > 0,
      ast: optimized,
      improvement: Math.min(this.eliminatedCount * 3, 100),
      reductions: { cse: this.eliminatedCount }
    };
  }
}
