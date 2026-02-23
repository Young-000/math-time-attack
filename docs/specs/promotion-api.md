# Cycle 2: 비게임 프로모션 서버 API

## Executive Summary

비게임 카테고리 전환으로 `grantPromotionRewardForGame()` API가 차단되었다(에러코드 40000). 이번 사이클에서는 Supabase Edge Function(mTLS) 기반의 서버 사이드 프로모션 API를 구현하여, 클라이언트에서 직접 게임 전용 API를 호출하는 대신 서버가 토스 비게임 프로모션 API 3단계 플로우를 대행한다.

---

## 아키텍처

```
Client (promotionService.ts)
  │
  │ POST /functions/v1/promotion
  │ { promotionCode, amount, userKey }
  │
  ▼
Supabase Edge Function (promotion/index.ts)
  │
  │ mTLS 인증 (TOSS_MTLS_CERT, TOSS_MTLS_KEY, TOSS_MTLS_CA)
  │
  ├── Step 1: POST /api-partner/v1/.../get-key
  │   → { key: "..." }
  │
  ├── Step 2: POST /api-partner/v1/.../execute-promotion
  │   → { resultType: "SUCCESS" }
  │
  └── Step 3: POST /api-partner/v1/.../execution-result (polling)
      → { success: "SUCCESS" | "PENDING" | "FAILED" }
  │
  ▼
Response to Client
  { success: true, key: "..." }
  or
  { success: false, error: "...", message: "..." }
```

---

## 토스 비게임 프로모션 API 스펙

### 1. get-key
- **Endpoint:** `POST /api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key`
- **Headers:** `x-toss-user-key`, `X-App-Key`, `Content-Type: application/json`
- **Body:** `{ promotionCode }`
- **Response:** `{ resultType: "SUCCESS", success: { key: "..." } }`
- **Key 유효시간:** 1시간

### 2. execute-promotion
- **Endpoint:** `POST /api-partner/v1/apps-in-toss/promotion/execute-promotion`
- **Body:** `{ promotionCode, key, amount }`
- **Response:** `{ resultType: "SUCCESS", success: { ... } }`

### 3. execution-result
- **Endpoint:** `POST /api-partner/v1/apps-in-toss/promotion/execution-result`
- **Body:** `{ promotionCode, key }`
- **Response:** `{ resultType: "SUCCESS", success: "SUCCESS" | "PENDING" | "FAILED" }`
- **Polling:** 최대 5회, 2초 간격

### 공통 에러 응답
```json
{
  "resultType": "FAIL",
  "error": {
    "errorType": 0,
    "errorCode": "CE1000",
    "reason": "에러 설명"
  }
}
```

---

## Edge Function 구조

```
supabase/functions/promotion/
  index.ts                          # 메인 핸들러 (요청 검증, DB 기록, 에러 처리)
  _shared/
    promotion-client.ts             # mTLS 프로모션 API 클라이언트 (3단계 플로우)
    types.ts                        # 프로모션 전용 타입 정의
```

공유 모듈 (auth Edge Function에서 재사용):
- `auth/_shared/cors.ts` -- CORS 헤더 유틸리티

---

## 클라이언트 플로우

```
1. isAppsInTossEnvironment() 체크 → 비AIT이면 즉시 에러 반환
2. localStorage 중복 체크 (math-attack-promo-claimed)
3. userKey 필수 검증
4. POST /functions/v1/promotion { promotionCode, amount, userKey }
5. 성공 시 → localStorage에 claimed 기록 + 성공 반환
6. ALREADY_CLAIMED 시 → localStorage에 claimed 기록 + 에러 반환
7. 기타 에러 → 에러 메시지 반환
```

### Public API

```typescript
// 서명 (기존 2-param에서 3-param으로 확장)
claimPromotion(promotionCode: string, amount: number, userKey?: string): Promise<PromotionResult>

// 테스트용
resetPromotionClaims(): void
```

---

## DB 스키마

```sql
CREATE TABLE math_attack.promotion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  promotion_code VARCHAR NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  promotion_key VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),
  error_code VARCHAR,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT promotion_records_unique UNIQUE (user_key, promotion_code)
);
```

- **RLS:** `service_role`만 접근 가능 (Edge Function 전용)
- **중복 방지:** `(user_key, promotion_code)` UNIQUE 제약 + 서버 측 status 체크

---

## 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `INVALID_REQUEST` | 400 | 요청 파라미터 누락/잘못됨 |
| `ALREADY_CLAIMED` | 409 | 이미 지급 완료된 프로모션 |
| `GET_KEY_FAILED` | 502 | 프로모션 키 발급 실패 |
| `EXECUTE_FAILED` | 502 | 프로모션 실행 실패 |
| `EXECUTION_RESULT_FAILED` | 502 | 실행 결과 조회 실패 |
| `PROMOTION_FAILED` | 502 | 프로모션 지급 최종 실패 |
| `POLLING_TIMEOUT` | 504 | execution-result 폴링 타임아웃 |
| `NETWORK_ERROR` | 502 | mTLS 통신 에러 |
| `SERVER_CONFIG_ERROR` | 500 | 환경변수 미설정 |
| `DB_ERROR` | 500 | DB 기록 실패 |

---

## 환경변수

Edge Function에 필요한 환경변수 (Supabase Dashboard에서 설정):

| 변수 | 용도 | 공유 |
|------|------|------|
| `TOSS_MTLS_CERT` | 클라이언트 인증서 (base64 PEM) | auth와 공유 |
| `TOSS_MTLS_KEY` | 클라이언트 개인키 (base64 PEM) | auth와 공유 |
| `TOSS_MTLS_CA` | CA 인증서 (base64 PEM) | auth와 공유 |
| `TOSS_API_BASE_URL` | 토스 파트너 API URL | auth와 공유 |
| `TOSS_APP_KEY` | 앱 식별 키 | auth와 공유 |
| `SUPABASE_URL` | Supabase 프로젝트 URL | 자동 제공 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 | 자동 제공 |

---

## 테스트 커버리지

`src/domain/services/__tests__/promotionService.test.ts`:

| 시나리오 | 검증 항목 |
|----------|----------|
| 비AIT 환경 | fetch 호출 없이 즉시 에러 반환 |
| userKey 미제공 | fetch 호출 없이 즉시 에러 반환 |
| Edge Function 성공 | 올바른 요청 전달, 성공 메시지, localStorage 기록 |
| 이미 지급됨 (클라이언트) | localStorage 체크로 fetch 미호출 |
| 이미 지급됨 (서버) | ALREADY_CLAIMED 응답 처리, localStorage 동기화 |
| Edge Function 에러 | 에러 코드/메시지 전달 |
| 네트워크 에러 | fetch throw 처리 |
| 다른 프로모션 코드 | 독립적 지급 가능 |

---

## 변경된 파일

| 파일 | 변경 |
|------|------|
| `supabase/functions/promotion/index.ts` | 신규: Edge Function 메인 핸들러 |
| `supabase/functions/promotion/_shared/promotion-client.ts` | 신규: mTLS 3단계 플로우 |
| `supabase/functions/promotion/_shared/types.ts` | 신규: 프로모션 타입 정의 |
| `supabase/migrations/20260224_add_promotion_records.sql` | 신규: DB 마이그레이션 |
| `src/domain/services/promotionService.ts` | 리팩토링: Edge Function 기반으로 전환 |
| `src/domain/services/__tests__/promotionService.test.ts` | 신규: 단위 테스트 |
| `src/presentation/pages/DifficultySelectPage.tsx` | 수정: userKey 전달 |
| `src/test/setup.ts` | 수정: 주석 업데이트 |
| `docs/specs/promotion-api.md` | 신규: 스펙 문서 |

---

## 배포 순서

1. DB 마이그레이션 적용: `promotion_records` 테이블 생성
2. Edge Function 배포: `supabase functions deploy promotion`
3. 환경변수 확인: mTLS 인증서가 이미 auth에서 설정되어 있으므로 추가 설정 불필요
4. 클라이언트 배포: promotionService.ts 변경사항 포함
