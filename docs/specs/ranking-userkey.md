# 랭킹 시스템 userKey 기반 전환

**Cycle 3** | 2026-02-24

## 배경

Cycle 1에서 `userIdentity.ts`를 `getUserKeyForGame()` hash 기반에서 `appLogin()` 기반 토스 userKey로 전환했다. 비게임 카테고리 앱에서 `getUserKeyForGame()`이 `INVALID_CATEGORY`를 반환하는 문제 때문이다.

Cycle 3에서는 랭킹 시스템이 이 새 userKey를 올바르게 사용하는지 확인하고 문서화한다.

## 결정 사항

### 컬럼명 유지

DB 컬럼 `odl_id`는 그대로 유지한다. **저장되는 값만 변경**된다.

| | 기존 | 신규 |
|---|---|---|
| 컬럼명 | `odl_id` | `odl_id` (유지) |
| 저장값 | `getUserKeyForGame()` hash | `appLogin()` userKey |
| 예시 | `abc123def456...` (SHA-256) | `toss-user-key-xyz` |

DB 마이그레이션 불필요.

### 레거시 데이터 보존

hash 기반 기존 데이터와 새 userKey 기반 데이터가 혼재한다. 역산이 불가하므로 매핑 없이 공존한다. 신규 기록부터 userKey로 저장된다.

## 아키텍처

```
rankingService.getCurrentUserId()
  → userIdentity.getUserId()
      → 캐시 있으면 반환
      → AIT 환경: appLogin() → Edge Function → userKey
      → 비AIT 환경: local-{timestamp}-{random} (fallback)
  → 결과를 rankingService 함수들에서 odl_id로 사용
```

## 파일별 역할

| 파일 | 역할 |
|------|------|
| `userIdentity.ts` | userKey 획득/캐싱 (Cycle 1에서 appLogin 기반으로 전환 완료) |
| `rankingService.ts` | `getCurrentUserId()` → `userIdentity.getUserId()` 위임 |
| `recordService.ts` | `odl_id` 컬럼으로 Supabase 읽기/쓰기 |

## 테스트

`rankingService.test.ts`의 mock이 실제 userKey 형식을 반영하도록 업데이트했다.

```typescript
// 전 (hash 스타일 mock)
getUserId: vi.fn(() => Promise.resolve('mock-local-user-id'))

// 후 (appLogin userKey 스타일 mock)
const MOCK_TOSS_USER_KEY = 'toss-user-key-abc123';
getUserId: vi.fn(() => Promise.resolve(MOCK_TOSS_USER_KEY))
```

`fetchMyRank` 테스트에 `getMyRank`가 올바른 userKey로 호출되는지 검증 추가.
