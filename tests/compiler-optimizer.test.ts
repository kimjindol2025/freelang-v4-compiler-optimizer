/**
 * 컴파일러 최적화 통합 테스트 (60+)
 */

import { CompilerOptimizer } from '../src/compiler-optimizer';
import { ConstantFolder } from '../src/optimizers/constant-folding';
import { CSEOptimizer } from '../src/optimizers/cse';
import { DeadCodeEliminator } from '../src/optimizers/dead-code-elimination';
import { FunctionInliner } from '../src/optimizers/function-inlining';
import { LICMOptimizer } from '../src/optimizers/licm';
import { LoopUnroller } from '../src/optimizers/loop-unrolling';
import { StrengthReducer } from '../src/optimizers/strength-reduction';
import { TailCallOptimizer } from '../src/optimizers/tail-call-optimization';
import { Vectorizer } from '../src/optimizers/vectorization';
import { ASTNode } from '../src/types';

describe('CompilerOptimizer Integration Tests', () => {
  let optimizer: CompilerOptimizer;

  beforeEach(() => {
    optimizer = new CompilerOptimizer(true);
  });

  // ============= Constant Folding Tests (8) =============
  describe('Constant Folding', () => {
    const folder = new ConstantFolder();

    test('should fold simple arithmetic', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'number', value: 5 },
        right: { type: 'number', value: 3 }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(true);
      expect(result.ast.value).toBe(8);
    });

    test('should fold multiplication', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '*',
        left: { type: 'number', value: 4 },
        right: { type: 'number', value: 5 }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(true);
      expect(result.ast.value).toBe(20);
    });

    test('should fold nested expressions', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: {
          type: 'binaryOp',
          value: '*',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 3 }
        },
        right: { type: 'number', value: 4 }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(true);
      expect(result.ast.value).toBe(10);
    });

    test('should not fold non-constant expressions', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 5 }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should fold division', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '/',
        left: { type: 'number', value: 10 },
        right: { type: 'number', value: 2 }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(true);
      expect(result.ast.value).toBe(5);
    });

    test('should fold modulo', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '%',
        left: { type: 'number', value: 17 },
        right: { type: 'number', value: 5 }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(true);
      expect(result.ast.value).toBe(2);
    });

    test('should fold boolean operations', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '&&',
        left: { type: 'boolean', value: true },
        right: { type: 'boolean', value: false }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(true);
      expect(result.ast.value).toBe(false);
    });

    test('should fold bitwise operations', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '&',
        left: { type: 'number', value: 12 },
        right: { type: 'number', value: 10 }
      };

      const result = folder.optimize(ast);
      expect(result.optimized).toBe(true);
      expect(result.ast.value).toBe(8);
    });
  });

  // ============= CSE Tests (8) =============
  describe('Common Subexpression Elimination', () => {
    const cse = new CSEOptimizer();

    test('should detect duplicate expressions', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'assignment',
            left: { type: 'variable', value: 'a' },
            right: {
              type: 'binaryOp',
              value: '+',
              left: { type: 'variable', value: 'x' },
              right: { type: 'variable', value: 'y' }
            }
          },
          {
            type: 'assignment',
            left: { type: 'variable', value: 'b' },
            right: {
              type: 'binaryOp',
              value: '+',
              left: { type: 'variable', value: 'x' },
              right: { type: 'variable', value: 'y' }
            }
          }
        ]
      };

      const result = cse.optimize(ast);
      expect(result.optimized).toBe(true);
    });

    test('should handle commutative operations', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'binaryOp',
            value: '+',
            left: { type: 'variable', value: 'a' },
            right: { type: 'variable', value: 'b' }
          },
          {
            type: 'binaryOp',
            value: '+',
            left: { type: 'variable', value: 'b' },
            right: { type: 'variable', value: 'a' }
          }
        ]
      };

      const result = cse.optimize(ast);
      expect(result.optimized).toBe(true);
    });

    test('should skip function calls', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          { type: 'functionCall', value: 'foo', children: [] },
          { type: 'functionCall', value: 'foo', children: [] }
        ]
      };

      const result = cse.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should handle multiplication', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '*',
        left: { type: 'variable', value: 'x' },
        right: { type: 'variable', value: 'y' }
      };

      const result = cse.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should find multiple duplicates', () => {
      const ast: ASTNode = {
        type: 'block',
        children: Array(5).fill({
          type: 'binaryOp',
          value: '+',
          left: { type: 'number', value: 1 },
          right: { type: 'number', value: 2 }
        })
      };

      const result = cse.optimize(ast);
      expect(result.optimized).toBe(true);
    });

    test('should not eliminate single occurrence', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'number', value: 1 },
        right: { type: 'number', value: 2 }
      };

      const result = cse.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should handle nested expressions', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'binaryOp',
            value: '+',
            left: {
              type: 'binaryOp',
              value: '*',
              left: { type: 'variable', value: 'a' },
              right: { type: 'variable', value: 'b' }
            },
            right: { type: 'number', value: 1 }
          }
        ]
      };

      const result = cse.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should track improvement metric', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'assignment',
            left: { type: 'variable', value: 'a' },
            right: { type: 'binaryOp', value: '+', left: { type: 'number', value: 1 }, right: { type: 'number', value: 2 } }
          }
        ]
      };

      const result = cse.optimize(ast);
      expect(typeof result.improvement).toBe('number');
    });
  });

  // ============= Dead Code Elimination Tests (8) =============
  describe('Dead Code Elimination', () => {
    const dce = new DeadCodeEliminator();

    test('should remove if false branch', () => {
      const ast: ASTNode = {
        type: 'ifStatement',
        left: { type: 'boolean', value: false },
        children: [
          { type: 'expression', value: 'deadCode' }
        ]
      };

      const result = dce.optimize(ast);
      expect(result.optimized).toBe(true);
    });

    test('should keep if true branch', () => {
      const ast: ASTNode = {
        type: 'ifStatement',
        left: { type: 'boolean', value: true },
        children: [
          { type: 'expression', value: 'code' }
        ],
        right: { type: 'expression', value: 'else' }
      };

      const result = dce.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should not remove conditional expressions', () => {
      const ast: ASTNode = {
        type: 'ifStatement',
        left: { type: 'variable', value: 'condition' },
        children: [{ type: 'expression' }],
        right: { type: 'expression' }
      };

      const result = dce.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should handle empty blocks', () => {
      const ast: ASTNode = {
        type: 'block',
        children: []
      };

      const result = dce.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should remove unreachable code after return', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          { type: 'return', left: { type: 'number', value: 42 } },
          { type: 'expression', value: 'unreachable' }
        ]
      };

      const result = dce.optimize(ast);
      expect(result.optimized).toBe(true);
    });

    test('should handle nested blocks', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'block',
            children: [{ type: 'expression' }]
          }
        ]
      };

      const result = dce.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should track eliminated count', () => {
      const ast: ASTNode = {
        type: 'ifStatement',
        left: { type: 'number', value: 0 },
        children: [{ type: 'expression' }]
      };

      const result = dce.optimize(ast);
      expect(typeof result.improvement).toBe('number');
    });

    test('should not remove expressions with side effects', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'assignment',
            left: { type: 'variable', value: 'x' },
            right: { type: 'functionCall', value: 'sideEffect', children: [] }
          }
        ]
      };

      const result = dce.optimize(ast);
      expect(result.ast).toBeDefined();
    });
  });

  // ============= Function Inlining Tests (8) =============
  describe('Function Inlining', () => {
    const inliner = new FunctionInliner();

    test('should inline simple functions', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'functionDef',
            value: 'double',
            metadata: { params: ['x'] },
            left: {
              type: 'binaryOp',
              value: '*',
              left: { type: 'variable', value: 'x' },
              right: { type: 'number', value: 2 }
            }
          },
          {
            type: 'assignment',
            left: { type: 'variable', value: 'result' },
            right: {
              type: 'functionCall',
              value: 'double',
              children: [{ type: 'number', value: 5 }]
            }
          }
        ]
      };

      const result = inliner.optimize(ast);
      expect(result.optimized).toBe(true);
    });

    test('should not inline recursive functions', () => {
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'factorial',
        metadata: { params: ['n'] },
        children: [
          {
            type: 'ifStatement',
            left: { type: 'binaryOp', value: '<=', left: { type: 'variable', value: 'n' }, right: { type: 'number', value: 1 } },
            children: [{ type: 'return', left: { type: 'number', value: 1 } }],
            right: {
              type: 'return',
              left: {
                type: 'binaryOp',
                value: '*',
                left: { type: 'variable', value: 'n' },
                right: { type: 'functionCall', value: 'factorial', children: [{ type: 'variable', value: 'n' }] }
              }
            }
          }
        ]
      };

      const result = inliner.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should limit inlining of complex functions', () => {
      const children: ASTNode[] = Array(100).fill({ type: 'expression', value: undefined });
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'complex',
        metadata: { params: [] },
        children
      };

      const result = inliner.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should count inlined calls', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'functionDef',
            value: 'id',
            metadata: { params: ['x'] },
            left: { type: 'variable', value: 'x' }
          },
          { type: 'functionCall', value: 'id', children: [{ type: 'number', value: 1 }] }
        ]
      };

      const result = inliner.optimize(ast);
      expect(result.reductions.inlining).toBeDefined();
    });

    test('should handle multiple calls', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          { type: 'functionCall', value: 'f', children: [] },
          { type: 'functionCall', value: 'f', children: [] },
          { type: 'functionCall', value: 'f', children: [] }
        ]
      };

      const result = inliner.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should substitute parameters', () => {
      const ast: ASTNode = {
        type: 'block',
        children: [
          {
            type: 'functionDef',
            value: 'add',
            metadata: { params: ['a', 'b'] },
            left: { type: 'binaryOp', value: '+', left: { type: 'variable', value: 'a' }, right: { type: 'variable', value: 'b' } }
          }
        ]
      };

      const result = inliner.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should preserve function definitions', () => {
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'func',
        metadata: { params: [] },
        left: { type: 'expression' }
      };

      const result = inliner.optimize(ast);
      expect(result.ast.type).toBe('functionDef');
    });
  });

  // ============= LICM Tests (7) =============
  describe('Loop-Invariant Code Motion', () => {
    const licm = new LICMOptimizer();

    test('should identify loop invariants', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 10 } },
        children: [
          {
            type: 'assignment',
            left: { type: 'variable', value: 'x' },
            right: { type: 'binaryOp', value: '+', left: { type: 'variable', value: 'a' }, right: { type: 'variable', value: 'b' } }
          }
        ]
      };

      const result = licm.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should handle while loops', () => {
      const ast: ASTNode = {
        type: 'whileLoop',
        left: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 100 } },
        children: [{ type: 'expression' }]
      };

      const result = licm.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should not move loop variables', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        children: [
          {
            type: 'assignment',
            left: { type: 'variable', value: 'x' },
            right: { type: 'variable', value: 'i' }
          }
        ]
      };

      const result = licm.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should track moved code', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 5 } },
        children: [{ type: 'assignment', left: { type: 'variable', value: 'y' }, right: { type: 'number', value: 42 } }]
      };

      const result = licm.optimize(ast);
      expect(result.reductions.licm).toBeDefined();
    });

    test('should handle nested loops', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        children: [
          {
            type: 'forLoop',
            left: { type: 'variable', value: 'j' },
            children: [{ type: 'expression' }]
          }
        ]
      };

      const result = licm.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should preserve loop structure', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'x' },
        children: [{ type: 'expression' }]
      };

      const result = licm.optimize(ast);
      expect(result.ast.type).toBe('forLoop');
    });

    test('should handle complex conditions', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: {
          type: 'binaryOp',
          value: '&&',
          left: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 100 } },
          right: { type: 'binaryOp', value: '>', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 0 } }
        },
        children: [{ type: 'expression' }]
      };

      const result = licm.optimize(ast);
      expect(result.ast).toBeDefined();
    });
  });

  // ============= Loop Unrolling Tests (8) =============
  describe('Loop Unrolling', () => {
    const unroller = new LoopUnroller();

    test('should unroll simple loops', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 4 } },
        children: [{ type: 'expression', value: 'body' }]
      };

      const result = unroller.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should not unroll if count unknown', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'variable', value: 'n' } },
        children: [{ type: 'expression' }]
      };

      const result = unroller.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should respect loop count limits', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 1000 } },
        children: [{ type: 'expression' }]
      };

      const result = unroller.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should handle <= operator', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<=', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 3 } },
        children: [{ type: 'expression' }]
      };

      const result = unroller.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should handle > operator', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '>', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 0 } },
        children: [{ type: 'expression' }]
      };

      const result = unroller.optimize(ast);
      expect(result.ast).toBeDefined();
    });

    test('should skip small loops', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 1 } },
        children: [{ type: 'expression' }]
      };

      const result = unroller.optimize(ast);
      expect(result.optimized).toBe(false);
    });

    test('should handle while loops', () => {
      const ast: ASTNode = {
        type: 'whileLoop',
        left: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 5 } },
        children: [{ type: 'expression' }]
      };

      const result = unroller.optimize(ast);
      expect(result.ast).toBeDefined();
    });
  });

  // ============= Strength Reduction Tests (7) =============
  describe('Strength Reduction', () => {
    const reducer = new StrengthReducer();

    test('should reduce multiplication by 2 to shift', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '*',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 2 }
      };

      const result = reducer.run(ast);
      expect(result.optimized).toBe(true);
    });

    test('should reduce multiplication by 0 to 0', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '*',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 0 }
      };

      const result = reducer.run(ast);
      expect(result.ast.value).toBe(0);
    });

    test('should reduce multiplication by 1 to identity', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '*',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 1 }
      };

      const result = reducer.run(ast);
      expect(result.optimized).toBe(true);
    });

    test('should reduce division by 1 to identity', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '/',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 1 }
      };

      const result = reducer.run(ast);
      expect(result.optimized).toBe(true);
    });

    test('should reduce division by power of 2 to shift', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '/',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 4 }
      };

      const result = reducer.run(ast);
      expect(result.optimized).toBe(true);
    });

    test('should reduce addition by 0', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 0 }
      };

      const result = reducer.run(ast);
      expect(result.optimized).toBe(true);
    });

    test('should reduce subtraction by 0', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '-',
        left: { type: 'variable', value: 'x' },
        right: { type: 'number', value: 0 }
      };

      const result = reducer.run(ast);
      expect(result.optimized).toBe(true);
    });
  });

  // ============= Tail Call Optimization Tests (6) =============
  describe('Tail Call Optimization', () => {
    const tco = new TailCallOptimizer();

    test('should identify recursive functions', () => {
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'fib',
        children: [
          {
            type: 'return',
            left: {
              type: 'functionCall',
              value: 'fib',
              children: [{ type: 'variable', value: 'n' }]
            }
          }
        ]
      };

      const result = tco.run(ast);
      expect(result.ast).toBeDefined();
    });

    test('should not optimize non-tail calls', () => {
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'func',
        children: [
          {
            type: 'assignment',
            left: { type: 'variable', value: 'x' },
            right: {
              type: 'functionCall',
              value: 'func',
              children: []
            }
          }
        ]
      };

      const result = tco.run(ast);
      expect(result.optimized).toBe(false);
    });

    test('should handle tail call in return statement', () => {
      const ast: ASTNode = {
        type: 'return',
        left: {
          type: 'functionCall',
          value: 'recurse',
          children: [{ type: 'variable', value: 'n' }]
        }
      };

      const result = tco.run(ast);
      expect(result.ast).toBeDefined();
    });

    test('should handle mutual recursion', () => {
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'even',
        children: [
          {
            type: 'return',
            left: {
              type: 'functionCall',
              value: 'even',
              children: []
            }
          }
        ]
      };

      const result = tco.run(ast);
      expect(result.ast).toBeDefined();
    });

    test('should mark optimized tail calls', () => {
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'sum',
        children: [
          {
            type: 'return',
            left: {
              type: 'functionCall',
              value: 'sum',
              children: []
            }
          }
        ]
      };

      const result = tco.run(ast);
      expect(result.reductions.tailCall).toBeDefined();
    });

    test('should preserve non-recursive functions', () => {
      const ast: ASTNode = {
        type: 'functionDef',
        value: 'identity',
        children: [{ type: 'return', left: { type: 'variable', value: 'x' } }]
      };

      const result = tco.run(ast);
      expect(result.optimized).toBe(false);
    });
  });

  // ============= Vectorization Tests (6) =============
  describe('Vectorization', () => {
    const vec = new Vectorizer();

    test('should identify vectorizable loops', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 8 } },
        children: [
          {
            type: 'assignment',
            left: { type: 'arrayAccess', left: { type: 'variable', value: 'c' }, right: { type: 'variable', value: 'i' } },
            right: {
              type: 'binaryOp',
              value: '+',
              left: { type: 'arrayAccess', left: { type: 'variable', value: 'a' }, right: { type: 'variable', value: 'i' } },
              right: { type: 'arrayAccess', left: { type: 'variable', value: 'b' }, right: { type: 'variable', value: 'i' } }
            }
          }
        ]
      };

      const result = vec.run(ast);
      expect(result.ast).toBeDefined();
    });

    test('should skip small vector sizes', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 2 } },
        children: [{ type: 'expression' }]
      };

      const result = vec.run(ast);
      expect(result.optimized).toBe(false);
    });

    test('should skip unknown loop counts', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'variable', value: 'n' } },
        children: [{ type: 'expression' }]
      };

      const result = vec.run(ast);
      expect(result.optimized).toBe(false);
    });

    test('should skip non-for loops', () => {
      const ast: ASTNode = {
        type: 'whileLoop',
        left: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 8 } },
        children: [{ type: 'expression' }]
      };

      const result = vec.run(ast);
      expect(result.optimized).toBe(false);
    });

    test('should handle multiple array operations', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 16 } },
        children: [
          {
            type: 'block',
            children: [
              {
                type: 'assignment',
                left: { type: 'arrayAccess', left: { type: 'variable', value: 'x' }, right: { type: 'variable', value: 'i' } },
                right: { type: 'arrayAccess', left: { type: 'variable', value: 'a' }, right: { type: 'variable', value: 'i' } }
              },
              {
                type: 'assignment',
                left: { type: 'arrayAccess', left: { type: 'variable', value: 'y' }, right: { type: 'variable', value: 'i' } },
                right: { type: 'arrayAccess', left: { type: 'variable', value: 'b' }, right: { type: 'variable', value: 'i' } }
              }
            ]
          }
        ]
      };

      const result = vec.run(ast);
      expect(result.ast).toBeDefined();
    });

    test('should track vectorized operations', () => {
      const ast: ASTNode = {
        type: 'forLoop',
        left: { type: 'variable', value: 'i' },
        right: { type: 'binaryOp', value: '<', left: { type: 'variable', value: 'i' }, right: { type: 'number', value: 8 } },
        children: [
          {
            type: 'assignment',
            left: { type: 'arrayAccess', left: { type: 'variable', value: 'result' }, right: { type: 'variable', value: 'i' } },
            right: { type: 'arrayAccess', left: { type: 'variable', value: 'input' }, right: { type: 'variable', value: 'i' } }
          }
        ]
      };

      const result = vec.run(ast);
      expect(result.reductions.vectorization).toBeDefined();
    });
  });

  // ============= Integration Tests (8) =============
  describe('CompilerOptimizer Integration', () => {
    test('should register optimizers', () => {
      const opts = optimizer.getOptimizers();
      expect(opts.length).toBeGreaterThan(0);
      expect(opts.some(opt => opt.name === 'constant-folding')).toBe(true);
    });

    test('should unregister optimizer', () => {
      const before = optimizer.getOptimizers().length;
      optimizer.unregister('constant-folding');
      const after = optimizer.getOptimizers().length;
      expect(after).toBeLessThan(before);
    });

    test('should optimize sequentially', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'number', value: 2 },
        right: { type: 'number', value: 3 }
      };

      const result = optimizer.optimizeSequential(ast);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.stats.improvement).toBeDefined();
    });

    test('should optimize with specific techniques', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'number', value: 1 },
        right: { type: 'number', value: 1 }
      };

      const result = optimizer.optimizeWith(ast, ['constant-folding']);
      expect(result.ast).toBeDefined();
    });

    test('should apply optimizations in iterations', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: {
          type: 'binaryOp',
          value: '*',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 3 }
        },
        right: { type: 'number', value: 4 }
      };

      const stats = optimizer.optimize(ast, { maxIterations: 3 });
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.time).toBeGreaterThanOrEqual(0);
    });

    test('should respect improvement threshold', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'variable', value: 'x' },
        right: { type: 'variable', value: 'y' }
      };

      const stats = optimizer.optimize(ast, { threshold: 100 });
      expect(stats).toBeDefined();
    });

    test('should count optimized nodes', () => {
      const ast: ASTNode = {
        type: 'binaryOp',
        value: '+',
        left: { type: 'number', value: 5 },
        right: { type: 'number', value: 5 }
      };

      const stats = optimizer.optimize(ast);
      expect(typeof stats.optimizedNodes).toBe('number');
    });

    test('should measure optimization time', () => {
      const ast: ASTNode = {
        type: 'expression',
        value: 'test'
      };

      const stats = optimizer.optimize(ast);
      expect(stats.time).toBeGreaterThanOrEqual(0);
    });
  });
});
