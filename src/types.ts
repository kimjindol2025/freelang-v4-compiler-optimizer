/**
 * 컴파일러 최적화 타입
 */

export interface ASTNode {
  type: string;
  value?: any;
  left?: ASTNode;
  right?: ASTNode;
  children?: ASTNode[];
  metadata?: Record<string, any>;
}

export interface OptimizationResult {
  optimized: boolean;
  ast: ASTNode;
  improvement: number;
  reductions: {
    constantFolding?: number;
    cse?: number;
    deadCode?: number;
    inlining?: number;
    licm?: number;
    loopUnroll?: number;
    strengthReduction?: number;
    tailCall?: number;
    vectorization?: number;
  };
}

export interface OptimizerStats {
  totalNodes: number;
  optimizedNodes: number;
  improvement: number; // 0-100
  time: number; // ms
}

export type BinaryOp = '+' | '-' | '*' | '/' | '%' | '&&' | '||' | '&' | '|' | '^';
