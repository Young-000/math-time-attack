# 통합 테스트 명세 (Integration Tests Spec)

Cycle 4에서 작성된 통합 테스트 명세.
인증/프로모션/랭킹 인프라의 전체 플로우를 검증한다.

## 테스트 파일 위치

```
src/__tests__/integration/
  auth-game-ranking.test.ts   (9 tests)
  auth-promotion.test.ts      (9 tests)
  fallback.test.ts           (15 tests)
```

---

## 1. auth-game-ranking.test.ts

**목적**: appLogin → userKey → 게임 기록 저장 → 랭킹 조회 전 플로우에서 사용자 식별자의 일관성 검증

### 테스트 시나리오

| 구분 | 시나리오 | 검증 포인트 |
|------|----------|-------------|
| Step 1 | appLogin 후 Edge Function으로 userKey 획득 | `userKey === MOCK_USER_KEY`, fetch URL `/functions/v1/auth` |
| Step 1 | 획득한 userKey는 이후 getUserId()에서 캐시로 반환 | appLogin 1회만 호출 |
| Step 2 | rankingService.getCurrentUserId가 인증된 userKey 반환 | userIdentity 위임 확인 |
| Step 2 | fetchMyRank는 userKey로 내 순위 조회 | Supabase 체인 mock, rank=3 |
| Step 2 | fetchRankingContext는 rankings + myRank 반환 | rankings 2개, myRank=1 |
| Step 3 | saveRecord는 로컬 기록 저장 후 서버 저장 시도 | isNewLocalRecord=true, localStorage 확인 |
| Step 3 | 동일 userKey로 저장된 기록이 rankingService를 통해 조회 | rankings[0].odl_id === MOCK_USER_KEY |
| 일관성 | 인증 후 모든 레이어에서 동일 userKey 사용 | identity = getUserId = rankingService |
| 일관성 | 비AIT 환경에서 모든 레이어가 동일 local- fallback ID 사용 | local- 접두사 |

### Mock 전략

- `@apps-in-toss/web-framework`: `appLogin`, `appLogin.isSupported` mock
- `@infrastructure/supabase`: `getSupabaseClient` → Supabase 체인 builder
- `globalThis.fetch`: Edge Function auth 응답 mock

### Supabase 체인 Mock 패턴

`getMyRank`는 두 번의 `from()` 호출을 사용:
1. `select('time').eq().eq().eq().order().limit().single()` → my best time
2. `select('*', {count}).eq().eq().lt()` → 나보다 빠른 기록 count (`.lt()`가 terminal)

---

## 2. auth-promotion.test.ts

**목적**: appLogin → userKey → claimPromotion 플로우 검증, 중복 방지 확인

### 테스트 시나리오

| 구분 | 시나리오 | 검증 포인트 |
|------|----------|-------------|
| 정상 | appLogin 후 프로모션 지급 | result.success=true, message에 포인트 포함 |
| 정상 | Edge Function에 올바른 userKey 전달 | body.userKey === MOCK_USER_KEY |
| 중복 방지 | 동일 코드 2회 시도 시 두 번째 차단 | fetch 추가 호출 없음 |
| 중복 방지 | 서버 ALREADY_CLAIMED → 클라이언트도 claimed 마킹 | 이후 재시도 클라이언트에서 차단 |
| 독립성 | 다른 코드는 동일 userKey로도 지급 가능 | fetch 3회 (auth + 2 promotion) |
| 비AIT | 비AIT 환경에서 프로모션 지급 불가 | AIT 에러, fetch 미호출 |
| 에러 | Edge Function 서버 에러 → 사용자 친화적 에러 메시지 | error에 코드+메시지 포함 |
| 에러 | 네트워크 에러 → claimed 마킹 안 됨 → 재시도 가능 | 재시도 후 success=true |
| 에러 | userKey 없이 호출 → 에러 반환, fetch 미호출 | AIT 에러 또는 userKey 에러 |

### fetch 응답 분리 패턴

auth와 promotion을 `mockResolvedValueOnce`로 순서대로 구분:
```typescript
mockAuthFetch();        // Edge Function /auth 응답
mockPromotionFetch({}); // Edge Function /promotion 응답
```

---

## 3. fallback.test.ts

**목적**: Edge Function 장애 시 localStorage fallback으로 graceful degradation 검증

### 테스트 시나리오

| 구분 | 시나리오 | 검증 포인트 |
|------|----------|-------------|
| 500 에러 | Edge Function 500 → local- fallback | console.warn 호출 |
| 500 에러 | fallback ID로 게임 기록 로컬 저장 | isNewLocalRecord=true |
| 500 에러 | fallback ID는 재시작 후에도 동일 | localStorage 영속성 |
| 네트워크 | 네트워크 에러 → fallback → 게임 정상 진행 | localStorage 저장 확인 |
| 네트워크 | getUserId는 fallback ID 반환 (캐시) | appLogin 1회 이상 호출 안 됨 |
| 비AIT | isAppsInTossEnvironment === false | 명시적 검증 |
| 비AIT | appLogin 미호출, fetch 미호출 | 순수 localStorage 경로 |
| 비AIT | 게임 기록 로컬 저장 정상 | 여러 난이도/연산 조합 |
| 비AIT | 더 좋은 기록이 기존 기록을 덮어쓴다 | 6000 < 8000 |
| 비AIT | 더 나쁜 기록은 최고 기록을 갱신 안 함 | isNewLocalRecord=false |
| Supabase 미설정 | isOnlineMode() 반환값 타입 확인 | boolean |
| Supabase 미설정 | saveRecord는 로컬 저장만 수행 | isNewLocalRecord=true |
| appLogin 실패 | null 반환 시 fallback | local- 접두사 |
| appLogin 실패 | SDK 예외 시 fallback | local- 접두사 |
| appLogin 실패 | 실패 후 게임 기록 로컬 저장 정상 | 6500ms 기록 |

---

## userIdentity.ts 변경사항

### AbortController 타임아웃 추가

`exchangeAuthCode` 함수에 5초 타임아웃 적용:

```typescript
const EDGE_FUNCTION_TIMEOUT_MS = 5_000;

async function exchangeAuthCode(authorizationCode: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      ...
      signal: controller.signal,
    });
    ...
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Edge Function 타임아웃 (${EDGE_FUNCTION_TIMEOUT_MS}ms)`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

타임아웃 발생 시 AbortError가 throw되어 `initializeUserIdentity`의 catch 블록에서 처리 → fallback ID 반환.

### 관련 단위 테스트 추가

`src/infrastructure/__tests__/userIdentity.test.ts`에 테스트 추가:
- "Edge Function 타임아웃(AbortError) 시 fallback ID를 반환한다"

---

## 테스트 실행 결과

```
Test Files  23 passed (23)
     Tests  325 passed (325)
```

- 기존 291 테스트: 모두 통과 (regression 없음)
- 신규 통합 테스트 33개: 모두 통과
- 타임아웃 단위 테스트 1개: 통과
