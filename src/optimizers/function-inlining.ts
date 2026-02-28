/**
 * 함수 인라이닝 (Function Inlining)
 * 작은 함수의 호출을 함수 본체로 치환하여 호출 오버헤드 제거
 * 예: fn double(x) { return x * 2; } result = double(5); → result = 5 * 2;
 */

import { ASTNode, OptimizationResult } from '../types';

interface FunctionDef {
  name: string;
  params: string[];
  body: ASTNode;
  callCount: number;
  complexity: number;
}

export class FunctionInliner {
  private functions: Map<string, FunctionDef> = new Map();
  private inlinedCount = 0;
  private MAX_BODY_SIZE = 50; // 바이트 단위 복잡도 임계값

  /**
   * 함수 본체의 복잡도 계산
   */
  private calculateComplexity(node: ASTNode): number {
    if (!node) return 0;

    let complexity = 1;

    if (node.left) complexity += this.calculateComplexity(node.left);
    if (node.right) complexity += this.calculateComplexity(node.right);
    if (node.children) {
      complexity += node.children.reduce((sum, child) => sum + this.calculateComplexity(child), 0);
    }

    // 제어 흐름 증가
    if (['if', 'while', 'for', 'switch'].includes(node.type)) {
      complexity *= 2;
    }

    return complexity;
  }

  /**
   * 함수 인라이닝에 적합한지 확인
   */
  private canInline(funcDef: FunctionDef): boolean {
    // 복잡도가 낮아야 함
    if (funcDef.complexity > this.MAX_BODY_SIZE) {
      return false;
    }

    // 재귀 함수는 인라이닝하지 않음
    if (this.isRecursive(funcDef.name, funcDef.body)) {
      return false;
    }

    // 호출 횟수가 적어야 함 (1-3회)
    return funcDef.callCount <= 3;
  }

  /**
   * 함수가 재귀인지 확인
   */
  private isRecursive(funcName: string, node: ASTNode): boolean {
    if (!node) return false;

    if (node.type === 'functionCall' && node.value === funcName) {
      return true;
    }

    if (node.left && this.isRecursive(funcName, node.left)) return true;
    if (node.right && this.isRecursive(funcName, node.right)) return true;
    if (node.children) {
      return node.children.some(child => this.isRecursive(funcName, child));
    }

    return false;
  }

  /**
   * 인라인할 함수 본체 복사 (깊은 복사)
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
   * 함수 호출 인자를 매개변수로 치환
   */
  private substitutateParameters(body: ASTNode, params: string[], args: ASTNode[]): ASTNode {
    const substituted = this.cloneNode(body);

    const substitute = (node: ASTNode): ASTNode => {
      if (node.type === 'variable') {
        const paramIndex = params.indexOf(node.value as string);
        if (paramIndex !== -1) {
          return this.cloneNode(args[paramIndex]);
        }
      }

      if (node.left) node.left = substitute(node.left);
      if (node.right) node.right = substitute(node.right);
      if (node.children) {
        node.children = node.children.map(child => substitute(child));
      }

      return node;
    };

    return substitute(substituted);
  }

  /**
   * 함수 정의 수집
   */
  private collectFunctions(node: ASTNode): void {
    if (!node) return;

    if (node.type === 'functionDef') {
      const funcName = node.value as string;
      const params = (node.metadata?.params as string[]) || [];
      const body = node.children?.[0] || node.left!;
      const complexity = this.calculateComplexity(body);

      this.functions.set(funcName, {
        name: funcName,
        params,
        body,
        callCount: 0,
        complexity
      });
    }

    if (node.left) this.collectFunctions(node.left);
    if (node.right) this.collectFunctions(node.right);
    if (node.children) {
      node.children.forEach(child => this.collectFunctions(child));
    }
  }

  /**
   * 함수 호출 횟수 계산
   */
  private countCalls(node: ASTNode): void {
    if (!node) return;

    if (node.type === 'functionCall') {
      const funcName = node.value as string;
      if (this.functions.has(funcName)) {
        this.functions.get(funcName)!.callCount++;
      }
    }

    if (node.left) this.countCalls(node.left);
    if (node.right) this.countCalls(node.right);
    if (node.children) {
      node.children.forEach(child => this.countCalls(child));
    }
  }

  /**
   * 함수 호출 인라이닝
   */
  private inlineFunctions(node: ASTNode): ASTNode {
    if (!node) return node;

    // 자식 노드 먼저 처리
    if (node.left) node.left = this.inlineFunctions(node.left);
    if (node.right) node.right = this.inlineFunctions(node.right);
    if (node.children) {
      node.children = node.children.map(child => this.inlineFunctions(child));
    }

    // 함수 호출 인라이닝
    if (node.type === 'functionCall') {
      const funcName = node.value as string;
      if (this.functions.has(funcName)) {
        const funcDef = this.functions.get(funcName)!;
        if (this.canInline(funcDef)) {
          const args = node.children || [];
          const inlined = this.substitutateParameters(funcDef.body, funcDef.params, args);
          inlined.metadata = inlined.metadata || {};
          inlined.metadata.inlined = true;
          this.inlinedCount++;
          return inlined;
        }
      }
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  optimize(ast: ASTNode): OptimizationResult {
    this.functions.clear();
    this.inlinedCount = 0;

    // 함수 정의 수집
    this.collectFunctions(ast);

    // 함수 호출 횟수 계산
    this.countCalls(ast);

    // 함수 호출 인라이닝
    const optimized = this.inlineFunctions(ast);

    return {
      optimized: this.inlinedCount > 0,
      ast: optimized,
      improvement: Math.min(this.inlinedCount * 8, 100),
      reductions: { inlining: this.inlinedCount }
    };
  }
}
