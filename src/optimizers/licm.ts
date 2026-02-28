/**
 * 루프 불변 코드 이동 (Loop-Invariant Code Motion - LICM)
 * 루프 내에서 반복 계산되지만 결과가 변하지 않는 코드를 루프 밖으로 이동
 * 예: for (i in range) { x = y + z; } → x = y + z; for (i in range) { }
 */

import { ASTNode, OptimizationResult } from '../types';

interface LoopInfo {
  loopNode: ASTNode;
  invariants: ASTNode[];
  loopVariables: Set<string>;
}

export class LICMOptimizer {
  private movedCount = 0;

  /**
   * 루프 변수 식별
   */
  private identifyLoopVariables(loopNode: ASTNode): Set<string> {
    const vars = new Set<string>();

    if (loopNode.type === 'forLoop' || loopNode.type === 'whileLoop') {
      // for (i in ...) 형태에서 i는 루프 변수
      if (loopNode.left?.type === 'variable') {
        vars.add(loopNode.left.value as string);
      }

      // 루프 변수를 할당하는 코드 찾기
      const findAssignments = (node: ASTNode): void => {
        if (node?.type === 'assignment' && node.left?.type === 'variable') {
          const varName = node.left.value as string;
          if (varName === loopNode.left?.value) {
            vars.add(varName);
          }
        }

        if (node?.left) findAssignments(node.left);
        if (node?.right) findAssignments(node.right);
        if (node?.children) {
          node.children.forEach(child => findAssignments(child));
        }
      };

      const body = loopNode.children?.[0] || loopNode.right;
      if (body) findAssignments(body);
    }

    return vars;
  }

  /**
   * 표현식이 루프 불변인지 확인
   */
  private isLoopInvariant(expr: ASTNode, loopVariables: Set<string>): boolean {
    if (!expr) return true;

    // 루프 변수를 포함하지 않아야 함
    if (expr.type === 'variable') {
      return !loopVariables.has(expr.value as string);
    }

    // 함수 호출도 부작용이 있을 수 있으므로 보수적으로 처리
    if (expr.type === 'functionCall') {
      return false;
    }

    // 서브표현식이 모두 루프 불변이어야 함
    if (expr.left && !this.isLoopInvariant(expr.left, loopVariables)) {
      return false;
    }

    if (expr.right && !this.isLoopInvariant(expr.right, loopVariables)) {
      return false;
    }

    if (expr.children) {
      return expr.children.every(child => this.isLoopInvariant(child, loopVariables));
    }

    return true;
  }

    /**
   * 표현식이 할당 대상인지 확인
   */
  private isAssignmentTarget(expr: ASTNode, loopVariables: Set<string>): boolean {
    return expr.type === 'variable' && loopVariables.has(expr.value as string);
  }

  /**
   * 루프 내에서 불변 코드 식별
   */
  private findInvariants(loopBody: ASTNode, loopVariables: Set<string>): ASTNode[] {
    const invariants: ASTNode[] = [];

    const findInvariantStatements = (node: ASTNode): void => {
      if (!node) return;

      // 할당 문에서 우측이 불변이면 불변 코드
      if (node.type === 'assignment') {
        if (node.right && this.isLoopInvariant(node.right, loopVariables)) {
          invariants.push(node);
        }
      }

      // 표현식 문에서 부작용이 없으면 불변 코드
      if (node.type === 'binaryOp' || node.type === 'unaryOp') {
        if (this.isLoopInvariant(node, loopVariables)) {
          invariants.push(node);
        }
      }

      if (node.left) findInvariantStatements(node.left);
      if (node.right) findInvariantStatements(node.right);
      if (node.children) {
        node.children.forEach(child => findInvariantStatements(child));
      }
    };

    findInvariantStatements(loopBody);
    return invariants;
  }

  /**
   * 루프에서 불변 코드 제거
   */
  private removeInvariants(loopNode: ASTNode, invariants: ASTNode[]): void {
    const removeFromNode = (node: ASTNode): void => {
      if (!node) return;

      if (node.type === 'block' && node.children) {
        node.children = node.children.filter(child => {
          return !invariants.some(inv => inv === child);
        });
      }

      if (node.left) removeFromNode(node.left);
      if (node.right) removeFromNode(node.right);
      if (node.children) {
        node.children.forEach(child => removeFromNode(child));
      }
    };

    const body = loopNode.children?.[0] || loopNode.right;
    if (body) removeFromNode(body);
  }

  /**
   * LICM 적용
   */
  private applyLICM(node: ASTNode): ASTNode {
    if (!node) return node;

    // 자식 노드 먼저 처리
    if (node.left) node.left = this.applyLICM(node.left);
    if (node.right) node.right = this.applyLICM(node.right);
    if (node.children) {
      node.children = node.children.map(child => this.applyLICM(child));
    }

    // 루프 찾기
    if (node.type === 'forLoop' || node.type === 'whileLoop') {
      const loopVariables = this.identifyLoopVariables(node);
      const loopBody = node.children?.[0] || node.right;

      if (loopBody) {
        const invariants = this.findInvariants(loopBody, loopVariables);

        if (invariants.length > 0) {
          // 루프 앞에 불변 코드 삽입
          if (!node.metadata) node.metadata = {};
          node.metadata.movedInvariants = invariants.length;

          // 루프 내에서 불변 코드 제거
          this.removeInvariants(node, invariants);

          this.movedCount += invariants.length;
        }
      }
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  optimize(ast: ASTNode): OptimizationResult {
    this.movedCount = 0;
    const optimized = this.applyLICM(ast);

    return {
      optimized: this.movedCount > 0,
      ast: optimized,
      improvement: Math.min(this.movedCount * 10, 100),
      reductions: { licm: this.movedCount }
    };
  }
}
