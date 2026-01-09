# Implementation Plan: Math Time Attack (연산 타임어택)

**Status**: 📋 Ready for Approval
**Started**: 2026-01-08
**Last Updated**: 2026-01-08

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Feature Description
지뢰찾기처럼 난이도별(초급/중급/고급)로 나뉘는 연산 타임어택 게임.
- **초급**: 구구단 (1-9단 × 1-9)
- **중급**: 19단 (1-19단 × 1-19)
- **고급**: 99단 (1-99단 × 1-99)

각 게임당 5문제를 최대한 빠르게 풀어 최단 시간을 기록하는 게임.

### Success Criteria
- [ ] 3가지 난이도(초급/중급/고급) 선택 가능
- [ ] 각 난이도에 맞는 곱셈 문제 5개 생성
- [ ] 정확한 타이머 동작 (밀리초 단위)
- [ ] 정답/오답 즉시 피드백
- [ ] 게임 완료 후 소요 시간 표시
- [ ] 난이도별 최고 기록 localStorage 저장
- [ ] 최고 기록 갱신 시 알림

### User Impact
- 수학 연산 능력 향상
- 집중력 및 반응 속도 훈련
- 게임적 요소로 재미있게 학습

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **새 프로젝트 생성** | 독립적인 서비스로 관리 용이 | 초기 세팅 필요 |
| **localStorage 우선** | 빠른 구현, 오프라인 지원 | 기기간 동기화 불가 (Phase 5에서 서버 연동 예정) |
| **곱셈 전용** | 명확한 스코프, 빠른 MVP | 이후 사칙연산 확장 필요 |
| **apps-in-toss 프레임워크** | 토스 앱 내 서비스 | 프레임워크 의존성 |
| **Clean Architecture** | 테스트 용이, 확장성 | 초기 구조 복잡도 |

---

## 📦 Dependencies

### Required Before Starting
- [x] Node.js 18+ 설치
- [x] apps-in-toss 프레임워크 이해

### External Dependencies
- `@apps-in-toss/web-framework`: ^1.7.0
- `@toss/tds-mobile`: ^2.2.0
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `react-router-dom`: ^6.20.0
- `vitest`: ^1.0.0 (테스트)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥90% | 문제 생성기, 게임 엔진, 기록 서비스 |
| **Integration Tests** | Critical paths | 게임 플로우 전체 |
| **E2E Tests** | Key user flows | 난이도 선택 → 게임 → 결과 확인 |

### Test File Organization
```
src/
├── domain/
│   └── __tests__/
│       ├── entities.test.ts
│       └── mathGameEngine.test.ts
├── data/
│   └── __tests__/
│       ├── problemGenerator.test.ts
│       └── recordService.test.ts
└── presentation/
    └── hooks/
        └── __tests__/
            └── useMathGame.test.ts
```

---

## 🚀 Implementation Phases

---

### Phase 1: 프로젝트 세팅 및 핵심 도메인
**Goal**: 프로젝트 초기 설정 + 핵심 타입/엔티티 정의 + 문제 생성 로직
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: 도메인 엔티티 타입 테스트
  - File: `src/domain/__tests__/entities.test.ts`
  - 테스트 케이스:
    - Difficulty enum 값 검증 ('easy' | 'medium' | 'hard')
    - Problem 타입 구조 검증 (firstNum, secondNum, answer)
    - GameConfig 상수 검증 (PROBLEMS_PER_GAME = 5)

- [ ] **Test 1.2**: 문제 생성기 테스트
  - File: `src/data/__tests__/problemGenerator.test.ts`
  - 테스트 케이스:
    - 초급: 1-9 × 1-9 범위 내 숫자 생성
    - 중급: 1-19 × 1-19 범위 내 숫자 생성
    - 고급: 1-99 × 1-99 범위 내 숫자 생성
    - 정답(answer)이 firstNum × secondNum인지 검증
    - 5개 문제 생성 확인

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.3**: 프로젝트 초기 설정
  - Files: `package.json`, `granite.config.ts`, `vite.config.ts`, `tsconfig.json`
  - 앱인토스 프레임워크 설정
  - Vitest 테스트 환경 설정

- [ ] **Task 1.4**: 도메인 엔티티 구현
  - File: `src/domain/entities/index.ts`
  - Difficulty, Problem, GameResult, GameState 타입 정의

- [ ] **Task 1.5**: 문제 생성기 구현
  - File: `src/data/problemGenerator.ts`
  - generateProblem(difficulty) 함수
  - generateProblems(difficulty, count) 함수

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.6**: 코드 정리
  - [ ] 타입 export 구조 정리
  - [ ] 난이도별 범위 상수화

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**TDD Compliance**:
- [ ] Tests written FIRST and initially failed
- [ ] Production code written to make tests pass
- [ ] Test coverage ≥90% for domain + data layer

**Validation Commands**:
```bash
# 테스트 실행
npm test

# 커버리지 확인
npm run test:coverage

# 타입 체크
npm run typecheck

# 빌드 확인
npm run build
```

**Manual Test Checklist**:
- [ ] generateProblems('easy', 5) 실행 시 1-9 범위 문제 5개 생성
- [ ] generateProblems('medium', 5) 실행 시 1-19 범위 문제 5개 생성
- [ ] generateProblems('hard', 5) 실행 시 1-99 범위 문제 5개 생성

---

### Phase 2: 게임 엔진 및 타이머 로직
**Goal**: 게임 상태 관리 + 정답 검증 + 타이머 로직
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 2.1**: 게임 엔진 테스트
  - File: `src/domain/__tests__/mathGameEngine.test.ts`
  - 테스트 케이스:
    - startGame(): 초기 상태 설정 검증
    - checkAnswer(): 정답/오답 판정
    - nextProblem(): 다음 문제 이동
    - isGameComplete(): 5문제 완료 여부
    - getElapsedTime(): 경과 시간 계산

- [ ] **Test 2.2**: 기록 서비스 테스트
  - File: `src/data/__tests__/recordService.test.ts`
  - 테스트 케이스:
    - getBestRecord(difficulty): 최고 기록 조회
    - saveBestRecord(difficulty, time): 기록 저장
    - isNewRecord(difficulty, time): 신기록 여부 판정

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.3**: 게임 엔진 구현
  - File: `src/domain/usecases/mathGameEngine.ts`
  - 게임 시작, 정답 체크, 다음 문제, 완료 체크 함수

- [ ] **Task 2.4**: 기록 서비스 구현
  - File: `src/data/recordService.ts`
  - localStorage 기반 최고 기록 저장/조회

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 2.5**: 코드 정리
  - [ ] 타이머 정밀도 개선 (performance.now() 사용)
  - [ ] 에러 핸들링 추가

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test
npm run test:coverage
npm run typecheck
```

**Manual Test Checklist**:
- [ ] 게임 시작 시 타이머 정상 시작
- [ ] 정답 입력 시 다음 문제로 이동
- [ ] 오답 시 같은 문제 유지
- [ ] 5문제 완료 시 게임 종료

---

### Phase 3: UI 구현 (난이도 선택 + 게임 화면)
**Goal**: 완전히 작동하는 게임 UI
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 3.1**: useMathGame 훅 테스트
  - File: `src/presentation/hooks/__tests__/useMathGame.test.ts`
  - 테스트 케이스:
    - 초기 상태 검증
    - startGame() 호출 시 상태 변경
    - submitAnswer() 호출 시 정답/오답 처리

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 3.2**: useMathGame 훅 구현
  - File: `src/presentation/hooks/useMathGame.ts`
  - 게임 상태 관리, 타이머, 정답 제출 로직

- [ ] **Task 3.3**: 난이도 선택 페이지
  - File: `src/presentation/pages/DifficultySelectPage.tsx`
  - 초급/중급/고급 선택 UI
  - 각 난이도별 최고 기록 표시

- [ ] **Task 3.4**: 게임 플레이 페이지
  - File: `src/presentation/pages/GamePage.tsx`
  - 문제 표시 (N × M = ?)
  - 숫자 입력 필드
  - 실시간 타이머 표시
  - 진행 상황 (1/5, 2/5...)

- [ ] **Task 3.5**: 라우팅 설정
  - File: `src/App.tsx`
  - react-router-dom 라우팅

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 3.6**: UI 정리
  - [ ] TDS 컴포넌트 활용
  - [ ] 반응형 레이아웃

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test
npm run build
npm run dev  # 수동 테스트
```

**Manual Test Checklist**:
- [ ] 난이도 선택 화면 정상 표시
- [ ] 난이도 선택 시 게임 화면 이동
- [ ] 문제와 타이머 정상 표시
- [ ] 숫자 입력 및 제출 동작

---

### Phase 4: 결과 화면 및 최종 완성
**Goal**: 결과 화면 + 기록 저장 + 전체 플로우 완성
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement Features**
- [ ] **Task 4.1**: 결과 페이지
  - File: `src/presentation/pages/ResultPage.tsx`
  - 소요 시간 표시 (초.밀리초)
  - 신기록 여부 표시
  - 다시하기 / 난이도 선택 버튼

- [ ] **Task 4.2**: 기록 저장 연동
  - 게임 완료 시 자동 기록 저장
  - 신기록 시 축하 애니메이션/메시지

- [ ] **Task 4.3**: 전체 플로우 연결
  - 난이도 선택 → 게임 → 결과 → 다시하기/홈

- [ ] **Task 4.4**: granite.config.ts 설정
  - 앱 이름, 아이콘, 색상 설정

**🔵 REFACTOR: Polish**
- [ ] **Task 4.5**: UX 개선
  - [ ] 키보드 자동 포커스
  - [ ] Enter 키로 제출
  - [ ] 오답 시 진동/시각 피드백
  - [ ] 신기록 축하 효과

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test
npm run build
npm run preview  # 프로덕션 빌드 테스트
```

**Manual Test Checklist**:
- [ ] 전체 게임 플로우 정상 동작
- [ ] 최고 기록 저장/표시 정상
- [ ] 신기록 갱신 시 알림
- [ ] 다시하기 버튼 동작
- [ ] 난이도 선택으로 돌아가기 동작

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 타이머 정밀도 이슈 | Low | Medium | performance.now() 사용, requestAnimationFrame 활용 |
| 모바일 키보드 UX | Medium | Medium | 숫자 키패드 강제, 입력 필드 포커스 관리 |
| localStorage 용량 | Low | Low | 난이도별 최고 기록만 저장 (최소 데이터) |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- 프로젝트 디렉토리 삭제 후 재시작

### If Phase 2 Fails
- src/domain/usecases/, src/data/recordService.ts 삭제
- Phase 1 상태로 복원

### If Phase 3 Fails
- src/presentation/ 삭제
- Phase 2 상태로 복원

### If Phase 4 Fails
- ResultPage.tsx 삭제, 기록 저장 로직 제거
- Phase 3 상태로 복원

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%

**Overall Progress**: 0% complete

---

## 📝 Notes & Learnings

### Implementation Notes
- (계획 승인 후 작성)

### Future Enhancements (Phase 5+)
- [ ] Supabase 연동하여 서버 기록 저장
- [ ] 사칙연산 모드 추가 (+, -, ×, ÷)
- [ ] 글로벌 랭킹 시스템
- [ ] 일일 챌린지 모드

---

## 📚 References

### Documentation
- [apps-in-toss 문서](https://toss.im/apps-in-toss)
- [TDS Mobile 컴포넌트](https://toss.im/tds)

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] Full integration testing performed
- [ ] Performance acceptable on mobile
- [ ] All 3 difficulties working correctly
- [ ] Record saving working

---

**Plan Status**: 📋 Ready for Approval
**Next Action**: 사용자 승인 후 Phase 1 시작
**Blocked By**: None
