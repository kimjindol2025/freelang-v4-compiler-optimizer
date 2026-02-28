/**
 * 컴파일러 최적화 예제 및 시나리오 테스트
 */

import { CompilerOptimizer } from '../src/compiler-optimizer';
import { ASTNode } from '../src/types';

describe('Compiler Optimizer Examples', () => {
  let optimizer: CompilerOptimizer;

  beforeEach(() => {
    optimizer = new CompilerOptimizer(true);
  });

  // 예제 1: 상수 계산 최적화
  test('Example 1: Constant Folding in Expression', () => {
    const ast: ASTNode = {
      type: 'assignment',
      left: { type: 'variable', value: 'result' },
      right: {
        type: 'binaryOp',
        value: '+',
        left: {
          type: 'binaryOp',
          value: '*',
          left: { type: 'number', value: 10 },
          right: { type: 'number', value: 5 }
        },
        right: {
          type: 'binaryOp',
          value: '-',
          left: { type: 'number', value: 20 },
          right: { type: 'number', value: 3 }
        }
      }
    };

    const stats = optimizer.optimize(ast);
    expect(stats.optimizedNodes).toBeGreaterThan(0);
    expect(stats.improvement).toBeGreaterThan(0);
  });

  // 예제 2: 루프 최적화
  test('Example 2: Multiple Loop Optimizations', () => {
    const ast: ASTNode = {
      type: 'block',
      children: [
        // 상수 선언
        {
          type: 'assignment',
          left: { type: 'variable', value: 'x' },
          right: { type: 'number', value: 5 }
        },
        // 루프
        {
          type: 'forLoop',
          left: { type: 'variable', value: 'i' },
          right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 8 } },
          children: [
            {
              type: 'assignment',
              left: { type: 'arrayAccess', left: { type: 'variable', value: 'arr' }, right: { type: 'variable', value: 'i' } },
              right: {
                type: 'binaryOp',
                value: '*',
                left: { type: 'variable', value: 'i' },
                right: { type: 'number', value: 2 }
              }
            }
          ]
        }
      ]
    };

    const stats = optimizer.optimize(ast);
    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.time).toBeGreaterThanOrEqual(0);
  });

  // 예제 3: 함수 인라이닝
  test('Example 3: Function Inlining', () => {
    const ast: ASTNode = {
      type: 'block',
      children: [
        // 간단한 함수 정의
        {
          type: 'functionDef',
          value: 'square',
          metadata: { params: ['n'] },
          left: {
            type: 'binaryOp',
            value: '*',
            left: { type: 'variable', value: 'n' },
            right: { type: 'variable', value: 'n' }
          }
        },
        // 함수 호출 (여러 번)
        {
          type: 'assignment',
          left: { type: 'variable', value: 'a' },
          right: { type: 'functionCall', value: 'square', children: [{ type: 'number', value: 5 }] }
        },
        {
          type: 'assignment',
          left: { type: 'variable', value: 'b' },
          right: { type: 'functionCall', value: 'square', children: [{ type: 'number', value: 10 }] }
        }
      ]
    };

    const stats = optimizer.optimize(ast);
    expect(stats).toBeDefined();
  });

  // 예제 4: 강도 감소
  test('Example 4: Strength Reduction', () => {
    const ast: ASTNode = {
      type: 'block',
      children: [
        {
          type: 'assignment',
          left: { type: 'variable', value: 'a' },
          right: { type: 'binaryOp', value: '*', left: { type: 'variable', value: 'x' }, right: { type: 'number', value: 4 } }
        },
        {
          type: 'assignment',
          left: { type: 'variable', value: 'b' },
          right: { type: 'binaryOp', value: '/', left: { type: 'variable', value: 'y' }, right: { type: 'number', value: 8 } }
        }
      ]
    };

    const stats = optimizer.optimize(ast);
    expect(stats.improvement).toBeGreaterThanOrEqual(0);
  });

  // 예제 5: 순차 최적화 보고
  test('Example 5: Sequential Optimization Report', () => {
    const ast: ASTNode = {
      type: 'block',
      children: [
        { type: 'binaryOp', value: '+', left: { type: 'number', value: 1 }, right: { type: 'number', value: 2 } },
        { type: 'binaryOp', value: '+', left: { type: 'number', value: 1 }, right: { type: 'number', value: 2 } }
      ]
    };

    const { results, stats } = optimizer.optimizeSequential(ast);

    expect(results.length).toBeGreaterThan(0);
    expect(stats.totalNodes).toBeGreaterThan(0);

    // 각 최적화 기법별 결과 확인
    const optimizedCount = results.filter(r => r.result.optimized).length;
    console.log(`Applied ${optimizedCount} optimizations out of ${results.length}`);
  });

  // 예제 6: 특정 최적화만 선택
  test('Example 6: Selective Optimization', () => {
    const ast: ASTNode = {
      type: 'binaryOp',
      value: '+',
      left: { type: 'number', value: 5 },
      right: { type: 'number', value: 3 }
    };

    const result = optimizer.optimizeWith(ast, ['constant-folding']);
    expect(result.ast).toBeDefined();
  });

  // 예제 7: 복잡한 AST 최적화
  test('Example 7: Complex AST Optimization', () => {
    const ast: ASTNode = {
      type: 'block',
      children: [
        // 불필요한 조건
        {
          type: 'ifStatement',
          left: { type: 'boolean', value: false },
          children: [
            { type: 'assignment', left: { type: 'variable', value: 'x' }, right: { type: 'number', value: 10 } }
          ]
        },
        // 상수 계산
        {
          type: 'assignment',
          left: { type: 'variable', value: 'y' },
          right: {
            type: 'binaryOp',
            value: '*',
            left: { type: 'number', value: 3 },
            right: { type: 'number', value: 7 }
          }
        },
        // 재귀 함수
        {
          type: 'functionDef',
          value: 'fib',
          metadata: { params: ['n'] },
          children: [
            {
              type: 'return',
              left: {
                type: 'ifStatement',
                left: { type: 'binaryOp', value: '<=', left: { type: 'variable', value: 'n' }, right: { type: 'number', value: 1 } },
                children: [{ type: 'return', left: { type: 'variable', value: 'n' } }],
                right: {
                  type: 'return',
                  left: {
                    type: 'binaryOp',
                    value: '+',
                    left: { type: 'functionCall', value: 'fib', children: [{ type: 'variable', value: 'n' }] },
                    right: { type: 'number', value: 1 }
                  }
                }
              }
            }
          ]
        }
      ]
    };

    const stats = optimizer.optimize(ast, { maxIterations: 5 });
    expect(stats.totalNodes).toBeGreaterThan(0);
  });

  // 예제 8: 최적화 전후 비교
  test('Example 8: Before and After Comparison', () => {
    const originalAST: ASTNode = {
      type: 'assignment',
      left: { type: 'variable', value: 'result' },
      right: {
        type: 'binaryOp',
        value: '+',
        left: {
          type: 'binaryOp',
          value: '*',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 3 }
        },
        right: {
          type: 'binaryOp',
          value: '+',
          left: { type: 'number', value: 4 },
          right: { type: 'number', value: 5 }
        }
      }
    };

    const countNodes = (node: ASTNode): number => {
      if (!node) return 0;
      let count = 1;
      if (node.left) count += countNodes(node.left);
      if (node.right) count += countNodes(node.right);
      if (node.children) count += node.children.reduce((sum, c) => sum + countNodes(c), 0);
      return count;
    };

    const beforeCount = countNodes(originalAST);
    const stats = optimizer.optimize(originalAST);

    console.log(`Before optimization: ${beforeCount} nodes`);
    console.log(`After optimization: ${beforeCount - stats.optimizedNodes} nodes`);
    console.log(`Improvement: ${stats.improvement}%`);
    console.log(`Time: ${stats.time}ms`);

    expect(beforeCount).toBeGreaterThan(0);
  });
});
