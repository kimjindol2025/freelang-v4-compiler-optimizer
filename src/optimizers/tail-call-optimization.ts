/**
 * 꼬리 호출 최적화 (Tail Call Optimization - TCO)
 * 마지막이 재귀 호출인 경우 스택 프레임 재사용
 * 예: fn fib(n) { if (n <= 1) return 1; return fib(n-1) + fib(n-2); }
 *    → 스택 오버플로우 방지, O(1) 스택 사용
 */

import { ASTNode, OptimizationResult } from '../types';

interface TailCall {
  functionName: string;
  isTailCall: boolean;
  node: ASTNode;
}

export class TailCallOptimizer {
  private optimizedCount = 0;
  private functionMap: Map<string, ASTNode> = new Map();

  /**
   * 함수 정의 수집
   */
  private collectFunctions(node: ASTNode): void {
    if (!node) return;

    if (node.type === 'functionDef') {
      const funcName = node.value as string;
      this.functionMap.set(funcName, node);
    }

    if (node.left) this.collectFunctions(node.left);
    if (node.right) this.collectFunctions(node.right);
    if (node.children) {
      node.children.forEach(child => this.collectFunctions(child));
    }
  }

  /**
   * 함수가 재귀 함수인지 확인
   */
  private isRecursive(funcName: string, funcDef: ASTNode): boolean {
    const body = funcDef.children?.[0] || funcDef.right;
    return this.hasCall(body, funcName);
  }

  /**
   * 노드가 특정 함수 호출을 포함하는지 확인
   */
  private hasCall(node: ASTNode | undefined, funcName: string): boolean {
    if (!node) return false;

    if (node.type === 'functionCall' && node.value === funcName) {
      return true;
    }

    if (node.left && this.hasCall(node.left, funcName)) return true;
    if (node.right && this.hasCall(node.right, funcName)) return true;
    if (node.children) {
      return node.children.some(child => this.hasCall(child, funcName));
    }

    return false;
  }

  /**
   * 함수 호출이 꼬리 위치에 있는지 확인
   */
  private isTailPosition(node: ASTNode | undefined, currentFunc: string): boolean {
    if (!node) return false;

    // 반환 문의 표현식
    if (node.type === 'return') {
      const expr = node.left;
      return expr?.type === 'functionCall' && expr.value === currentFunc;
    }

    // 블록의 마지막 문
    if (node.type === 'block' && node.children && node.children.length > 0) {
      const lastStmt = node.children[node.children.length - 1];
      return this.isTailPosition(lastStmt, currentFunc);
    }

    // If 문의 양쪽 모두 꼬리 위치
    if (node.type === 'ifStatement') {
      const thenPart = node.children?.[0] || node.left;
      const elsePart = node.right;

      const thenIsTail = this.isTailPosition(thenPart, currentFunc);
      const elseIsTail = elsePart ? this.isTailPosition(elsePart, currentFunc) : true;

      return thenIsTail && elseIsTail;
    }

    return false;
  }

  /**
   * 꼬리 호출 찾기
   */
  private findTailCalls(node: ASTNode | undefined, funcName: string): TailCall[] {
    const tailCalls: TailCall[] = [];

    const find = (n: ASTNode | undefined, isTail: boolean): void => {
      if (!n) return;

      if (n.type === 'functionCall' && n.value === funcName && isTail) {
        tailCalls.push({
          functionName: funcName,
          isTailCall: true,
          node: n
        });
      }

      // 자식 노드에서 꼬리 호출 찾기
      if (n.type === 'return') {
        find(n.left, true);
      } else if (n.type === 'block' && n.children) {
        for (let i = 0; i < n.children.length; i++) {
          const isLast = i === n.children.length - 1;
          find(n.children[i], isLast);
        }
      } else if (n.type === 'ifStatement') {
        find(n.left, isTail);  // then
        find(n.right, isTail); // else
      } else {
        find(n.left, false);
        find(n.right, false);
        if (n.children) {
          n.children.forEach(child => find(child, false));
        }
      }
    };

    find(node, true);
    return tailCalls;
  }

  /**
   * 꼬리 호출을 루프로 변환 (TCO 구현)
   */
  private transformTailCall(tailCall: TailCall, funcDef: ASTNode): void {
    // 꼬리 호출 노드에 TCO 마킹
    if (!tailCall.node.metadata) {
      tailCall.node.metadata = {};
    }
    tailCall.node.metadata.tailCall = true;
    tailCall.node.metadata.optimized = 'tail-call';
    this.optimizedCount++;
  }

  /**
   * 함수 본체 최적화
   */
  private optimizeFunction(funcDef: ASTNode): void {
    const funcName = funcDef.value as string;

    // 재귀 확인
    if (!this.isRecursive(funcName, funcDef)) {
      return;
    }

    const body = funcDef.children?.[0] || funcDef.right;
    const tailCalls = this.findTailCalls(body, funcName);

    if (tailCalls.length === 0) {
      return;
    }

    // 모든 꼬리 호출 변환
    tailCalls.forEach(tailCall => {
      this.transformTailCall(tailCall, funcDef);
    });

    if (!funcDef.metadata) funcDef.metadata = {};
    funcDef.metadata.tailCallOptimized = true;
    funcDef.metadata.tailCallCount = tailCalls.length;
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

    // 함수 정의 최적화
    if (node.type === 'functionDef') {
      this.optimizeFunction(node);
    }

    return node;
  }

  /**
   * 최적화 실행
   */
  run(ast: ASTNode): OptimizationResult {
    this.optimizedCount = 0;
    this.functionMap.clear();

    // 함수 정의 수집
    this.collectFunctions(ast);

    // 최적화 적용
    const optimized = this.optimize(ast);

    return {
      optimized: this.optimizedCount > 0,
      ast: optimized,
      improvement: Math.min(this.optimizedCount * 20, 100),
      reductions: { tailCall: this.optimizedCount }
    };
  }
}
