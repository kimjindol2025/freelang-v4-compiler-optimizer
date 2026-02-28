/**
 * 죽은 코드 제거 (Dead Code Elimination)
 * 사용되지 않는 코드, 도달할 수 없는 코드를 제거
 * 예: if (false) { deadCode; } → 제거
 */

import { ASTNode, OptimizationResult } from '../types';

interface VariableUse {
  defined: boolean;
  used: boolean;
}

export class DeadCodeEliminator {
  private unusedVariables: Set<string> = new Set();
  private eliminatedCount = 0;

  /**
   * 변수 사용 분석
   */
  private analyzeVariables(node: ASTNode | undefined, varMap: Map<string, VariableUse>): void {
    if (!node) return;

    if (node.type === 'assignment') {
      const varName = node.left?.value as string;
      if (varName) {
        varMap.set(varName, { defined: true, used: false });
      }
      if (node.right) {
        this.analyzeVariables(node.right, varMap);
      }
    } else if (node.type === 'variable') {
      const varName = node.value as string;
      const existing = varMap.get(varName);
      if (existing) {
        existing.used = true;
      }
    }

    if (node.left) this.analyzeVariables(node.left, varMap);
    if (node.right) this.analyzeVariables(node.right, varMap);
    if (node.children) {
      node.children.forEach(child => this.analyzeVariables(child, varMap));
    }
  }

  /**
   * 도달 불가능한 코드 감지
   */
  private isUnreachable(node: ASTNode, previousTerminator: boolean): boolean {
    if (previousTerminator) {
      if (node.type !== 'label' && node.type !== 'function') {
        return true;
      }
    }
    return false;
  }

  /**
   * 조건이 항상 거짓인지 확인
   */
  private isAlwaysFalse(node: ASTNode | undefined): boolean {
    if (!node) return false;
    if (node.type === 'boolean' && node.value === false) return true;
    if (node.type === 'number' && node.value === 0) return true;
    if (node.type === 'null') return true;
    return false;
  }

  /**
   * 조건이 항상 참인지 확인
   */
  private isAlwaysTrue(node: ASTNode | undefined): boolean {
    if (!node) return false;
    if (node.type === 'boolean' && node.value === true) return true;
    if (node.type === 'number' && node.value !== 0) return true;
    if (node.type === 'string') return true;
    return false;
  }

  /**
   * 노드가 종료(return, break, continue)를 포함하는지 확인
   */
  private isTerminator(node: ASTNode | undefined): boolean {
    if (!node) return false;
    if (['return', 'break', 'continue', 'throw'].includes(node.type)) {
      return true;
    }
    if (node.type === 'ifStatement') {
      const thenTerminate = this.isTerminator(node.left);
      const elseTerminate = this.isTerminator(node.right);
      return thenTerminate && elseTerminate;
    }
    return false;
  }

  /**
   * AST 트리 정리
   */
  private removeDeadCode(node: ASTNode | null, varMap: Map<string, VariableUse>): ASTNode | null {
    if (!node) return null;

    // if (false) { ... } 제거
    if (node.type === 'ifStatement') {
      const condition = node.left;
      if (this.isAlwaysFalse(condition)) {
        this.eliminatedCount++;
        // else 블록만 반환
        return node.right || null;
      }
      if (this.isAlwaysTrue(condition)) {
        this.eliminatedCount++;
        // then 블록만 반환
        return node.children?.[0] || null;
      }
    }

    // 도달 불가능한 코드 제거 (block 내에서)
    if (node.type === 'block' && node.children) {
      let terminated = false;
      const filtered: ASTNode[] = [];

      for (const child of node.children) {
        if (terminated && this.isUnreachable(child, true)) {
          this.eliminatedCount++;
          continue;
        }
        const cleaned = this.removeDeadCode(child, varMap);
        if (cleaned) {
          filtered.push(cleaned);
          if (this.isTerminator(child)) {
            terminated = true;
          }
        }
      }

      node.children = filtered;
    }

    // 사용되지 않는 변수 할당 제거
    if (node.type === 'assignment') {
      const varName = node.left?.value as string;
      if (varName && varMap.has(varName)) {
        const usage = varMap.get(varName)!;
        if (!usage.used) {
          this.eliminatedCount++;
          // 우측이 부작용이 없으면 전체 제거
          if (node.right?.type === 'variable' || node.right?.type === 'number' ||
              node.right?.type === 'string' || node.right?.type === 'boolean') {
            return null;
          }
        }
      }
    }

    // 자식 노드 재귀 처리
    if (node.left) node.left = this.removeDeadCode(node.left, varMap) || node.left;
    if (node.right) node.right = this.removeDeadCode(node.right, varMap) || node.right;
    if (node.children) {
      node.children = node.children
        .map(child => this.removeDeadCode(child, varMap))
        .filter((child): child is ASTNode => child !== null);
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  optimize(ast: ASTNode): OptimizationResult {
    this.eliminatedCount = 0;
    const varMap = new Map<string, VariableUse>();

    // 변수 사용 분석
    this.analyzeVariables(ast, varMap);

    // 죽은 코드 제거
    const optimized = this.removeDeadCode(ast, varMap) || ast;

    return {
      optimized: this.eliminatedCount > 0,
      ast: optimized,
      improvement: Math.min(this.eliminatedCount * 2, 100),
      reductions: { deadCode: this.eliminatedCount }
    };
  }
}
