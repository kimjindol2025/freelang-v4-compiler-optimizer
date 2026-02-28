/**
 * 컴파일러 최적화 통합기
 * 9개의 최적화 기법을 순차적으로 적용
 */

import { ASTNode, OptimizationResult, OptimizerStats } from './types';
import { ConstantFolder } from './optimizers/constant-folding';
import { CSEOptimizer } from './optimizers/cse';
import { DeadCodeEliminator } from './optimizers/dead-code-elimination';
import { FunctionInliner } from './optimizers/function-inlining';
import { LICMOptimizer } from './optimizers/licm';
import { LoopUnroller } from './optimizers/loop-unrolling';
import { StrengthReducer } from './optimizers/strength-reduction';
import { TailCallOptimizer } from './optimizers/tail-call-optimization';
import { Vectorizer } from './optimizers/vectorization';

export class CompilerOptimizer {
  private optimizers: Array<{
    name: string;
    optimizer: any;
    weight: number; // 최적화 우선순위 (1-10)
  }> = [];

  constructor(private enableAll: boolean = true) {
    if (enableAll) {
      this.registerDefaults();
    }
  }

  /**
   * 기본 최적화 기법 등록
   */
  private registerDefaults(): void {
    // 순서: 상수 → 죽은 코드 → CSE → LICM → 루프 펼침 → 강도 감소 → 인라이닝 → TCO → 벡터화
    this.register('constant-folding', new ConstantFolder(), 10);
    this.register('dead-code-elimination', new DeadCodeEliminator(), 9);
    this.register('cse', new CSEOptimizer(), 8);
    this.register('licm', new LICMOptimizer(), 7);
    this.register('loop-unrolling', new LoopUnroller(), 6);
    this.register('strength-reduction', new StrengthReducer(), 5);
    this.register('function-inlining', new FunctionInliner(), 4);
    this.register('tail-call-optimization', new TailCallOptimizer(), 3);
    this.register('vectorization', new Vectorizer(), 2);
  }

  /**
   * 최적화 기법 등록
   */
  register(name: string, optimizer: any, weight: number): void {
    this.optimizers.push({ name, optimizer, weight });
  }

  /**
   * 최적화 기법 제거
   */
  unregister(name: string): void {
    this.optimizers = this.optimizers.filter(opt => opt.name !== name);
  }

  /**
   * 노드 개수 계산
   */
  private countNodes(node: ASTNode): number {
    if (!node) return 0;

    let count = 1;

    if (node.left) count += this.countNodes(node.left);
    if (node.right) count += this.countNodes(node.right);
    if (node.children) {
      count += node.children.reduce((sum, child) => sum + this.countNodes(child), 0);
    }

    return count;
  }

  /**
   * 최적화 통합 실행
   */
  optimize(ast: ASTNode, options?: {
    maxIterations?: number;
    threshold?: number; // 최소 개선도 임계값 (%)
  }): OptimizerStats {
    const maxIterations = options?.maxIterations || 3;
    const threshold = options?.threshold || 0;

    const startTime = Date.now();
    const initialNodes = this.countNodes(ast);

    let currentAST = ast;
    let totalImprovement = 0;
    let iterationCount = 0;

    // 여러 번 반복 (최적화가 다른 최적화 기회를 만들 수 있음)
    for (let iter = 0; iter < maxIterations; iter++) {
      let iterationImproved = false;
      const sortedOptimizers = [...this.optimizers].sort((a, b) => b.weight - a.weight);

      for (const { name, optimizer } of sortedOptimizers) {
        let result: OptimizationResult;

        // 최적화 기법별 메서드명 (일관성)
        if (optimizer.optimize) {
          result = optimizer.optimize(currentAST);
        } else if (optimizer.run) {
          result = optimizer.run(currentAST);
        } else {
          continue;
        }

        if (result.optimized && result.improvement >= threshold) {
          currentAST = result.ast;
          totalImprovement = Math.max(totalImprovement, result.improvement);
          iterationImproved = true;
        }
      }

      iterationCount++;

      // 개선이 없으면 반복 종료
      if (!iterationImproved) {
        break;
      }
    }

    const endTime = Date.now();
    const finalNodes = this.countNodes(currentAST);
    const optimizedNodes = initialNodes - finalNodes;

    return {
      totalNodes: initialNodes,
      optimizedNodes,
      improvement: totalImprovement,
      time: endTime - startTime
    };
  }

  /**
   * 순차 최적화 (각 기법을 한 번씩만 적용)
   */
  optimizeSequential(ast: ASTNode): {
    results: Array<{ name: string; result: OptimizationResult }>;
    stats: OptimizerStats;
  } {
    const startTime = Date.now();
    const initialNodes = this.countNodes(ast);

    const results: Array<{ name: string; result: OptimizationResult }> = [];
    let currentAST = ast;
    let totalImprovement = 0;

    for (const { name, optimizer } of this.optimizers) {
      let result: OptimizationResult;

      if (optimizer.optimize) {
        result = optimizer.optimize(currentAST);
      } else if (optimizer.run) {
        result = optimizer.run(currentAST);
      } else {
        continue;
      }

      results.push({ name, result });

      if (result.optimized) {
        currentAST = result.ast;
        totalImprovement = Math.max(totalImprovement, result.improvement);
      }
    }

    const endTime = Date.now();
    const finalNodes = this.countNodes(currentAST);

    return {
      results,
      stats: {
        totalNodes: initialNodes,
        optimizedNodes: initialNodes - finalNodes,
        improvement: totalImprovement,
        time: endTime - startTime
      }
    };
  }

  /**
   * 특정 최적화 기법만 적용
   */
  optimizeWith(ast: ASTNode, optimizerNames: string[]): OptimizationResult {
    let currentAST = ast;

    for (const name of optimizerNames) {
      const opt = this.optimizers.find(o => o.name === name);
      if (!opt) continue;

      let result: OptimizationResult;

      if (opt.optimizer.optimize) {
        result = opt.optimizer.optimize(currentAST);
      } else if (opt.optimizer.run) {
        result = opt.optimizer.run(currentAST);
      } else {
        continue;
      }

      if (result.optimized) {
        currentAST = result.ast;
      }
    }

    return {
      optimized: this.countNodes(ast) > this.countNodes(currentAST),
      ast: currentAST,
      improvement: 0,
      reductions: {}
    };
  }

  /**
   * 등록된 최적화 기법 목록
   */
  getOptimizers(): Array<{ name: string; weight: number }> {
    return this.optimizers.map(opt => ({
      name: opt.name,
      weight: opt.weight
    }));
  }

  /**
   * 최적화 기법 활성화/비활성화
   */
  setEnabled(name: string, enabled: boolean): void {
    const index = this.optimizers.findIndex(opt => opt.name === name);
    if (index !== -1) {
      if (!enabled) {
        this.optimizers.splice(index, 1);
      }
    } else if (enabled) {
      // 재활성화 시 기본값으로 추가 (구현 생략)
    }
  }
}
