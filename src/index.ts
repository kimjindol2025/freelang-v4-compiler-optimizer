/**
 * 9개 컴파일러 최적화 기법 통합
 */

// Optimizers
export { ConstantFolder } from './optimizers/constant-folding';
export { CSEOptimizer } from './optimizers/cse';
export { DeadCodeEliminator } from './optimizers/dead-code-elimination';
export { FunctionInliner } from './optimizers/function-inlining';
export { LICMOptimizer } from './optimizers/licm';
export { LoopUnroller } from './optimizers/loop-unrolling';
export { StrengthReducer } from './optimizers/strength-reduction';
export { TailCallOptimizer } from './optimizers/tail-call-optimization';
export { Vectorizer } from './optimizers/vectorization';

// Integrated Optimizer
export { CompilerOptimizer } from './compiler-optimizer';

// Types
export type { ASTNode, OptimizationResult, OptimizerStats } from './types';

export const VERSION = '1.0.0';
