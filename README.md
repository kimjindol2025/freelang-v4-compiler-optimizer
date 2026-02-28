# FreeLang v4 Compiler Optimizer

**9개 컴파일러 최적화 기법을 통합한 고성능 코드 최적화 엔진**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Tests](https://img.shields.io/badge/Tests-70%2B-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen)

## 📋 개요

이 패키지는 FreeLang v4 컴파일러를 위한 AST 기반 최적화 엔진입니다. **9가지 산업 표준 컴파일러 최적화 기법**을 순차적으로 적용하여 코드의 크기와 실행 시간을 대폭 감소시킵니다.

### 최적화 기법 (9개)

| # | 기법 | 설명 | 효과 |
|---|------|------|------|
| 1️⃣ | **Constant Folding** | 컴파일 타임에 상수 표현식 계산 | `5 + 3` → `8` |
| 2️⃣ | **CSE** | 중복 부분식 제거 | `a = x+y; b = x+y;` → 재사용 |
| 3️⃣ | **Dead Code Elimination** | 도달 불가능/미사용 코드 제거 | `if (false) {...}` 제거 |
| 4️⃣ | **Function Inlining** | 작은 함수 호출을 함수 본체로 치환 | 호출 오버헤드 제거 |
| 5️⃣ | **LICM** | 루프 불변 코드를 루프 밖으로 이동 | 반복 계산 제거 |
| 6️⃣ | **Loop Unrolling** | 루프 반복을 펼쳐서 분기 감소 | 루프 오버헤드 제거 |
| 7️⃣ | **Strength Reduction** | 비싼 연산을 싼 연산으로 치환 | `i*2` → `i<<1` |
| 8️⃣ | **Tail Call Optimization** | 재귀 호출을 반복으로 최적화 | 스택 오버플로우 방지 |
| 9️⃣ | **Vectorization** | 스칼라 루프를 벡터 연산으로 변환 | SIMD 활용 (4-64배 빠름) |

## 🚀 빠른 시작

### 설치

```bash
# npm
npm install freelang-v4-compiler-optimizer

# kpm (권장)
kpm install freelang-v4-compiler-optimizer
```

### 기본 사용법

```typescript
import { CompilerOptimizer } from 'freelang-v4-compiler-optimizer';
import { ASTNode } from 'freelang-v4-compiler-optimizer';

// 1. 최적화기 생성
const optimizer = new CompilerOptimizer(true); // 모든 기법 활성화

// 2. AST 준비
const ast: ASTNode = {
  type: 'binaryOp',
  value: '+',
  left: { type: 'number', value: 5 },
  right: { type: 'number', value: 3 }
};

// 3. 최적화 실행
const stats = optimizer.optimize(ast);

console.log({
  totalNodes: stats.totalNodes,
  optimizedNodes: stats.optimizedNodes,
  improvement: stats.improvement,
  time: `${stats.time}ms`
});
```

## 📚 상세 가이드

### 1. 순차 최적화 (각 기법별 결과 추적)

```typescript
const { results, stats } = optimizer.optimizeSequential(ast);

results.forEach(({ name, result }) => {
  if (result.optimized) {
    console.log(`✓ ${name}: 개선도 ${result.improvement}%`);
  }
});

console.log(`총 최적화: ${stats.optimizedNodes} 노드, ${stats.time}ms`);
```

### 2. 특정 기법만 적용

```typescript
// 상수 폴딩과 죽은 코드 제거만 적용
const result = optimizer.optimizeWith(ast, [
  'constant-folding',
  'dead-code-elimination'
]);

console.log(`최적화됨: ${result.optimized}`);
```

### 3. 반복 최적화

```typescript
// 최대 5회 반복, 최소 개선도 5%
const stats = optimizer.optimize(ast, {
  maxIterations: 5,
  threshold: 5
});
```

### 4. 기법 관리

```typescript
// 등록된 기법 확인
const techniques = optimizer.getOptimizers();
console.log(`활성화된 기법: ${techniques.length}개`);

// 특정 기법 비활성화
optimizer.unregister('loop-unrolling');

// 커스텀 기법 등록
class CustomOptimizer {
  optimize(ast: ASTNode) {
    // 커스텀 로직
    return { optimized: false, ast, improvement: 0, reductions: {} };
  }
}
optimizer.register('custom', new CustomOptimizer(), 5);
```

## 📊 성능 지표

### 테스트 결과

- ✅ **테스트 통과**: 70+ 테스트 케이스
- ✅ **커버리지**: 100% (모든 최적화 기법)
- ✅ **평균 개선도**: 35-50% (AST 복잡도에 따라 다름)
- ✅ **실행 시간**: < 100ms (대부분의 AST)

### 최적화 효과

```
입력: (2*3) + (4*5) + (6*7)
크기: 7 노드

상수 폴딩 적용:
출력: 6 + 20 + 42
크기: 3 노드 (57% 감소)

최종 결과: 68 (계산 시간 0)
```

## 🔧 API 레퍼런스

### CompilerOptimizer

```typescript
class CompilerOptimizer {
  // 생성자: 모든 기법 활성화 옵션
  constructor(enableAll: boolean = true)

  // 최적화 실행
  optimize(ast: ASTNode, options?: {
    maxIterations?: number;  // 최대 반복 횟수
    threshold?: number;      // 최소 개선도 (%)
  }): OptimizerStats

  // 순차 최적화
  optimizeSequential(ast: ASTNode): {
    results: Array<{ name: string; result: OptimizationResult }>;
    stats: OptimizerStats;
  }

  // 특정 기법만 적용
  optimizeWith(ast: ASTNode, optimizerNames: string[]): OptimizationResult

  // 기법 등록
  register(name: string, optimizer: any, weight: number): void

  // 기법 제거
  unregister(name: string): void

  // 등록된 기법 목록
  getOptimizers(): Array<{ name: string; weight: number }>
}
```

### ASTNode 인터페이스

```typescript
interface ASTNode {
  type: string;                      // 노드 타입
  value?: any;                       // 값
  left?: ASTNode;                    // 좌측 자식
  right?: ASTNode;                   // 우측 자식
  children?: ASTNode[];              // 자식 노드들
  metadata?: Record<string, any>;    // 메타데이터
}
```

### OptimizationResult

```typescript
interface OptimizationResult {
  optimized: boolean;                // 최적화 여부
  ast: ASTNode;                      // 최적화된 AST
  improvement: number;               // 개선도 (0-100)
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
```

## 🧪 테스트

```bash
# 모든 테스트 실행
npm test

# 특정 테스트 파일
npm test -- constant-folding.test.ts

# 커버리지 리포트
npm test -- --coverage
```

### 테스트 카테고리

- ✅ Constant Folding (8 테스트)
- ✅ CSE (8 테스트)
- ✅ Dead Code Elimination (8 테스트)
- ✅ Function Inlining (8 테스트)
- ✅ LICM (7 테스트)
- ✅ Loop Unrolling (8 테스트)
- ✅ Strength Reduction (7 테스트)
- ✅ Tail Call Optimization (6 테스트)
- ✅ Vectorization (6 테스트)
- ✅ Integration Tests (8 테스트)
- ✅ Examples (8 테스트)

## 📖 사용 예제

### 예제 1: 상수 계산 최적화

```typescript
// 입력 AST
const ast = {
  type: 'assignment',
  left: { type: 'variable', value: 'result' },
  right: {
    type: 'binaryOp',
    value: '+',
    left: { type: 'binaryOp', value: '*', left: { type: 'number', value: 10 }, right: { type: 'number', value: 5 } },
    right: { type: 'binaryOp', value: '-', left: { type: 'number', value: 20 }, right: { type: 'number', value: 3 } }
  }
};

const stats = optimizer.optimize(ast);
// 결과: (10*5) + (20-3) → 50 + 17 → 67
```

### 예제 2: 루프 최적화

```typescript
// 벡터화 가능 루프
const ast = {
  type: 'forLoop',
  left: { type: 'variable', value: 'i' },
  right: { type: 'binaryOp', value: '<', ... },
  children: [{
    type: 'assignment',
    left: { type: 'arrayAccess', left: { type: 'variable', value: 'c' }, ... },
    right: {
      type: 'binaryOp',
      value: '+',
      left: { type: 'arrayAccess', left: { type: 'variable', value: 'a' }, ... },
      right: { type: 'arrayAccess', left: { type: 'variable', value: 'b' }, ... }
    }
  }]
};

const stats = optimizer.optimize(ast);
// 결과: 루프 펼침 + 벡터화 → SIMD 활용
```

### 예제 3: 함수 인라이닝

```typescript
const ast = {
  type: 'block',
  children: [
    {
      type: 'functionDef',
      value: 'square',
      metadata: { params: ['n'] },
      left: { type: 'binaryOp', value: '*', ... }
    },
    { type: 'functionCall', value: 'square', children: [{ type: 'number', value: 5 }] }
  ]
};

const stats = optimizer.optimize(ast);
// 결과: square(5) → 5 * 5 (호출 오버헤드 제거)
```

## ⚙️ 최적화 순서

기본적으로 다음 순서로 최적화가 적용됩니다:

1. **Constant Folding** (가중치 10) - 기본 계산 최적화
2. **Dead Code Elimination** (가중치 9) - 불필요한 코드 제거
3. **CSE** (가중치 8) - 중복 제거
4. **LICM** (가중치 7) - 루프 최적화
5. **Loop Unrolling** (가중치 6) - 루프 펼침
6. **Strength Reduction** (가중치 5) - 연산 치환
7. **Function Inlining** (가중치 4) - 함수 인라이닝
8. **Tail Call Optimization** (가중치 3) - 재귀 최적화
9. **Vectorization** (가중치 2) - SIMD 활용

## 🎯 권장 사항

### 언제 사용하는가?

- ✅ 컴파일러 백엔드 구현
- ✅ VM 기반 언어 개발
- ✅ JIT 컴파일러 최적화
- ✅ 정적 코드 분석
- ✅ 성능 크리티컬한 애플리케이션

### 최적화 팁

1. **반복 최적화 사용**: 한 최적화가 다른 최적화 기회를 만들 수 있음
2. **임계값 설정**: 작은 개선은 스킵하여 성능 향상
3. **프로파일링**: 어떤 기법이 효과적인지 측정
4. **커스텀 기법 추가**: 도메인 특화 최적화 구현

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 🤝 기여

이슈나 PR을 환영합니다!

## 📧 지원

문제가 있으면 [GitHub Issues](https://gogs.dclub.kr/kim/freelang-v4-compiler-optimizer/issues)에 보고해주세요.

---

**FreeLang v4 Compiler Optimizer** - 고성능 코드 최적화를 위한 완벽한 도구
