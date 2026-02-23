# Cycle 1: appLogin + Supabase Edge Function 기반 인증 인프라 구축

## Executive Summary

구구단 챌린지(Math Time Attack)가 앱인토스 "비게임" 카테고리로 전환됨에 따라, 기존 `getUserKeyForGame()` 기반 유저 식별이 더 이상 동작하지 않는다(에러코드 40000: INVALID_CATEGORY). 이번 사이클에서는 `appLogin()` + Supabase Edge Function(mTLS) 기반의 새로운 인증 인프라를 구축하여, 비게임 앱에서도 안정적으로 사용자를 식별하고 향후 프로모션/랭킹 시스템의 기반을 마련한다. 이 인프라가 없으면 사용자 식별, 랭킹, 프로모션 등 핵심 기능이 모두 동작 불가하므로 최우선으로 해결해야 한다.

---

## Discovery Context

- **Desired Outcome:** 비게임 전환 후에도 100%의 AIT 사용자가 고유하게 식별되어 랭킹/프로모션 기능을 사용할 수 있다.
- **Opportunity:** 비게임 카테고리 전환으로 기존 게임 전용 API(`getUserKeyForGame`, `grantPromotionRewardForGame`)가 완전 차단됨. 사용자 식별 불가 -> 랭킹 비정상 -> 프로모션 지급 불가.
- **Evidence:** 앱인토스 콘솔에서 비게임으로 카테고리 변경 완료. `getUserKeyForGame()` 호출 시 `INVALID_CATEGORY` 반환 확인. `grantPromotionRewardForGame()` 에러코드 40000 확인.
- **Alternative Solutions Considered:**
  1. 게임 카테고리 유지 -- 거부됨: 앱인토스 정책상 비게임 앱은 비게임으로 등록 필수.
  2. 클라이언트만으로 appLogin 토큰 처리 -- 거부됨: mTLS 인증서를 클라이언트에 노출할 수 없음(보안).
  3. 별도 백엔드 서버(NestJS 등) 구축 -- 거부됨: 운영 비용 과다. Edge Function이면 충분.
- **Why This Solution:** Supabase Edge Function은 이미 인프라가 존재하고, 별도 서버 운영 비용 없이 mTLS 통신이 가능하며, Supabase 프로젝트 환경변수로 인증서를 안전하게 관리할 수 있다.

---

## Impact Map

- **Goal:** 비게임 전환 후 사용자 식별 성공률 100% 유지 (현재: 0% -- getUserKeyForGame 완전 차단)
- **Actor:** 앱인토스에서 구구단 챌린지를 실행하는 일반 사용자
- **Impact:** 사용자가 앱 진입 시 자동으로 로그인되어, 기존과 동일하게 랭킹 조회/게임 기록 저장/프로모션 수령이 가능하다.
- **Deliverable:** appLogin() 클라이언트 플로우 + mTLS Edge Function + userIdentity.ts 리팩토링

---

## JTBD

When 앱인토스에서 구구단 챌린지를 열 때,
I want to 별도 로그인 절차 없이 바로 게임을 시작하고 싶고,
so I can 내 기록과 랭킹이 저장되어 다음에 이어서 진행할 수 있다.

### Forces of Progress

- **Push:** 현재 getUserKeyForGame이 INVALID_CATEGORY를 반환하여 사용자 식별 불가. 랭킹에 "익명"으로 표시.
- **Pull:** appLogin 기반 인증은 비게임/게임 구분 없이 동작하며, 실제 userKey를 제공하므로 프로모션까지 활용 가능.
- **Anxiety:** Edge Function 장애 시 로그인 실패 우려. mTLS 인증서 만료 시 전체 서비스 중단 가능성.
- **Inertia:** 기존 localStorage fallback이 "동작은 하는" 상태 (로컬 ID로 게임은 가능하나 cross-device 식별 불가).

---

## Problem

- **Who:** 앱인토스 구구단 챌린지 사용자 (토스 앱 내에서 미니앱 실행)
- **Pain:** 비게임 전환 후 사용자 식별이 완전 차단됨. 빈도: 모든 사용자, 모든 세션. 심각도: Critical(핵심 기능 불가).
- **Current workaround:** localStorage에 `local-{timestamp}-{random}` ID를 생성하여 사용. 기기 변경/앱 재설치 시 식별자 유실. 프로모션 지급 불가.
- **Why now:** 앱인토스 비게임 카테고리 전환이 완료되어 기존 게임 API가 즉시 차단됨. 프로모션 수익화 경로가 완전히 막힌 상태.

---

## Solution

### Overview

사용자가 앱을 열면 클라이언트에서 `appLogin()`을 호출하여 일회성 authorizationCode를 받는다. 이 코드를 Supabase Edge Function으로 전송하면, Edge Function이 mTLS 인증서를 사용하여 토스 파트너 API에서 AccessToken을 발급받고, 토큰에서 userKey를 추출하여 클라이언트에 반환한다. AccessToken과 RefreshToken은 서버(Edge Function) 측에서만 관리하며, 클라이언트에는 userKey만 전달한다.

이 접근법은 (1) mTLS 인증서를 클라이언트에 노출하지 않고, (2) 토스 OAuth 토큰을 서버 측에서만 보관하며, (3) 기존 userIdentity.ts의 인터페이스를 유지하여 하위 호환성을 보장한다.

### Architecture Diagram

```
[Client: React App]                    [Supabase Edge Function]              [Toss Partner API]
       |                                        |                                    |
  1. appLogin()                                 |                                    |
       |---> { authorizationCode }              |                                    |
       |                                        |                                    |
  2. POST /functions/v1/auth                    |                                    |
       |--- authorizationCode ----------------->|                                    |
       |                                   3. mTLS POST                              |
       |                                        |--- generate-token ---------------->|
       |                                        |<-- { accessToken, refreshToken } --|
       |                                        |                                    |
       |                                   4. Decode accessToken                     |
       |                                        |--- extract userKey                 |
       |                                        |                                    |
       |                                   5. Store tokens (server-side)             |
       |                                        |                                    |
       |<-- { userKey } -----------------------|                                    |
       |                                        |                                    |
  6. Cache userKey (localStorage)               |                                    |
```

---

### 1. appLogin() 클라이언트 플로우 (UI 없는 자동 로그인)

#### 1.1 호출 시점

앱 초기화 시(`main.tsx`의 `initializeUserIdentity()`) 자동 호출. 사용자에게 로그인 UI를 보여주지 않는다.

```typescript
// @apps-in-toss/web-framework
import { appLogin } from '@apps-in-toss/web-framework';

// 반환 타입
type AppLoginResult = {
  authorizationCode: string;  // 일회성 인가 코드 (10분 유효)
  referrer: string;           // 유입 경로 정보
};
```

#### 1.2 호출 조건

| 조건 | 동작 |
|------|------|
| AIT 환경 + 캐시된 userKey 없음 | appLogin() 호출 |
| AIT 환경 + 캐시된 userKey 있음 + 유효 | 캐시 반환 (appLogin 스킵) |
| AIT 환경 + 캐시된 userKey 있음 + 만료 | appLogin() 재호출 |
| 비AIT 환경 (웹 브라우저) | appLogin 스킵, localStorage fallback |

#### 1.3 에러 케이스

| 에러 | 원인 | 처리 |
|------|------|------|
| `appLogin()` 미지원 (undefined 반환) | 앱 버전 낮음 | localStorage fallback |
| `appLogin()` 예외 발생 | SDK 내부 오류 | localStorage fallback + console.warn |
| Edge Function 통신 실패 | 네트워크/서버 오류 | localStorage fallback + 재시도 큐 |
| authorizationCode 만료 | 10분 초과 | appLogin() 재호출 |

#### 1.4 AIT 환경 감지

기존 `isAppsInTossEnvironment()`는 `getUserKeyForGame.isSupported`를 사용하나, 비게임에서는 이 함수 자체가 변경될 수 있다. `appLogin`의 존재 여부로 환경을 판별한다.

```typescript
export function isAppsInTossEnvironment(): boolean {
  try {
    // appLogin 함수의 isSupported 체크 (비게임 호환)
    const fn = appLogin as unknown as { isSupported?: () => boolean };
    return typeof fn.isSupported === 'function' && fn.isSupported();
  } catch {
    return false;
  }
}
```

---

### 2. Supabase Edge Function 아키텍처 (mTLS 통신)

#### 2.1 함수 구조

```
supabase/
  functions/
    auth/
      index.ts              # 메인 핸들러 (라우팅)
      _shared/
        toss-api-client.ts  # mTLS 토스 API 클라이언트
        token-store.ts      # 토큰 저장소 (Supabase DB)
        types.ts            # 공유 타입 정의
        cors.ts             # CORS 헤더 유틸리티
```

#### 2.2 Edge Function 엔드포인트

**`POST /functions/v1/auth`** -- 토큰 교환 (클라이언트 -> Edge Function -> 토스 API)

Request:
```json
{
  "authorizationCode": "one-time-auth-code-from-appLogin"
}
```

Response (성공):
```json
{
  "userKey": "toss-user-unique-key",
  "expiresAt": "2026-02-24T13:00:00Z"
}
```

Response (실패):
```json
{
  "error": "INVALID_AUTH_CODE",
  "message": "authorizationCode가 만료되었거나 이미 사용되었습니다"
}
```

#### 2.3 mTLS 설정

토스 파트너 API는 모든 서버 간 통신에 mTLS(mutual TLS)를 요구한다. 인증서는 앱인토스 콘솔에서 발급받으며, Supabase Edge Function의 환경변수로 주입한다.

| 환경변수 | 설명 | 형식 |
|----------|------|------|
| `TOSS_MTLS_CERT` | 클라이언트 인증서 | PEM (base64 encoded) |
| `TOSS_MTLS_KEY` | 클라이언트 개인키 | PEM (base64 encoded) |
| `TOSS_MTLS_CA` | CA 인증서 (토스 루트 CA) | PEM (base64 encoded) |
| `TOSS_API_BASE_URL` | 토스 파트너 API 베이스 URL | `https://api-partner.toss.im` |
| `TOSS_APP_KEY` | 앱 식별 키 (콘솔에서 발급) | string |

#### 2.4 mTLS 통신 구현

Supabase Edge Function(Deno 런타임)에서 mTLS 통신:

```typescript
// supabase/functions/auth/_shared/toss-api-client.ts

const TOSS_MTLS_CERT = Deno.env.get('TOSS_MTLS_CERT') ?? '';
const TOSS_MTLS_KEY = Deno.env.get('TOSS_MTLS_KEY') ?? '';
const TOSS_MTLS_CA = Deno.env.get('TOSS_MTLS_CA') ?? '';
const TOSS_API_BASE_URL = Deno.env.get('TOSS_API_BASE_URL') ?? 'https://api-partner.toss.im';
const TOSS_APP_KEY = Deno.env.get('TOSS_APP_KEY') ?? '';

// base64 PEM 디코딩
function decodePem(encoded: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  );
}

/**
 * mTLS fetch wrapper for Toss Partner API
 */
async function tossApiFetch(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const cert = decodePem(TOSS_MTLS_CERT);
  const key = decodePem(TOSS_MTLS_KEY);
  const caCerts = [decodePem(TOSS_MTLS_CA)];

  // Deno의 Deno.createHttpClient를 사용하여 mTLS 설정
  const client = Deno.createHttpClient({
    certChain: cert,
    privateKey: key,
    caCerts,
  });

  return fetch(`${TOSS_API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': TOSS_APP_KEY,
    },
    body: JSON.stringify(body),
    client,
  });
}
```

> **주의:** Deno의 `Deno.createHttpClient`는 현재 unstable API이다. Edge Function에서 사용 가능 여부를 스파이크에서 반드시 검증해야 한다(Riskiest Assumption #1 참고). 대안으로 Node.js 호환 `https.Agent` 또는 Deno의 `Deno.connectTls()`를 검토한다.

---

### 3. 토큰 교환 플로우 (authorizationCode -> AccessToken -> userKey)

#### 3.1 전체 시퀀스

```
Step 1: 클라이언트 appLogin() 호출
  -> { authorizationCode, referrer }

Step 2: 클라이언트 -> Edge Function
  POST /functions/v1/auth
  Body: { authorizationCode }

Step 3: Edge Function -> 토스 파트너 API (mTLS)
  POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
  Body: { authorizationCode, appKey: TOSS_APP_KEY }
  <- { accessToken, refreshToken, tokenType, expiresIn }

Step 4: Edge Function이 accessToken에서 userKey 추출
  - JWT decode (verify 불필요 -- 서버 내부 처리)
  - payload.sub 또는 payload.userKey 필드

Step 5: Edge Function이 토큰을 서버 측에 저장
  - math_attack.user_sessions 테이블에 INSERT/UPSERT
  - accessToken, refreshToken, expiresAt 저장

Step 6: Edge Function -> 클라이언트
  Response: { userKey, expiresAt }
```

#### 3.2 토스 generate-token API 상세

```
POST https://api-partner.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token

Headers:
  Content-Type: application/json
  X-App-Key: {TOSS_APP_KEY}
  (mTLS 인증서로 TLS 핸드셰이크)

Body:
{
  "authorizationCode": "one-time-code"
}

Response (200):
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}

Response (4xx):
{
  "errorCode": "INVALID_AUTHORIZATION_CODE",
  "message": "만료되었거나 이미 사용된 인가 코드입니다"
}
```

#### 3.3 에러 처리 매핑

| 토스 API 응답 | Edge Function 응답 | 클라이언트 동작 |
|---------------|-------------------|----------------|
| 200 OK | `{ userKey, expiresAt }` | userKey 캐싱, 정상 진행 |
| 400 INVALID_AUTHORIZATION_CODE | `{ error: 'INVALID_AUTH_CODE' }` | appLogin() 재호출 (최대 1회) |
| 400 EXPIRED_AUTHORIZATION_CODE | `{ error: 'EXPIRED_AUTH_CODE' }` | appLogin() 재호출 (최대 1회) |
| 401 Unauthorized (mTLS 실패) | `{ error: 'SERVER_AUTH_FAILED' }` | localStorage fallback |
| 500 Server Error | `{ error: 'TOSS_SERVER_ERROR' }` | localStorage fallback + 60초 후 재시도 |
| Network Error (Edge Function -> 토스) | `{ error: 'NETWORK_ERROR' }` | localStorage fallback |

---

### 4. userIdentity.ts 리팩토링 상세

#### 4.1 현재 구조 vs 목표 구조

**현재 (getUserKeyForGame 기반):**
```
initializeUserIdentity()
  -> isAppsInTossEnvironment() (getUserKeyForGame.isSupported)
  -> getUserKeyForGame()
  -> result.hash -> localStorage 캐싱
  -> fallback: local-{timestamp}-{random}
```

**목표 (appLogin 기반):**
```
initializeUserIdentity()
  -> isAppsInTossEnvironment() (appLogin.isSupported)
  -> appLogin() -> { authorizationCode }
  -> Edge Function 호출 -> { userKey }
  -> userKey -> localStorage 캐싱 (TTL 포함)
  -> fallback: local-{timestamp}-{random}
```

#### 4.2 새로운 userIdentity.ts 설계

```typescript
// src/infrastructure/userIdentity.ts

import { appLogin } from '@apps-in-toss/web-framework';

// --- 상수 ---
const USER_KEY_CACHE = 'math-attack-user-key';
const USER_KEY_EXPIRY = 'math-attack-user-key-expiry';
const LOCAL_USER_ID_KEY = 'math-time-attack-local-user-id';
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 캐시 TTL: AccessToken 만료보다 약간 짧게 (50분, 토큰 유효기간 60분 기준)
const CACHE_TTL_MS = 50 * 60 * 1000;

let cachedUserKey: string | null = null;

// --- 환경 감지 ---
export function isAppsInTossEnvironment(): boolean {
  try {
    const fn = appLogin as unknown as { isSupported?: () => boolean };
    return typeof fn.isSupported === 'function' && fn.isSupported();
  } catch {
    return false;
  }
}

// --- 캐시 관리 ---
function getCachedUserKey(): string | null {
  if (cachedUserKey) return cachedUserKey;
  try {
    const key = localStorage.getItem(USER_KEY_CACHE);
    const expiry = localStorage.getItem(USER_KEY_EXPIRY);
    if (key && expiry && Date.now() < Number(expiry)) {
      cachedUserKey = key;
      return key;
    }
    // 만료된 캐시 정리
    localStorage.removeItem(USER_KEY_CACHE);
    localStorage.removeItem(USER_KEY_EXPIRY);
  } catch {
    // localStorage 접근 실패
  }
  return null;
}

function setCachedUserKey(userKey: string, ttlMs: number = CACHE_TTL_MS): void {
  cachedUserKey = userKey;
  try {
    localStorage.setItem(USER_KEY_CACHE, userKey);
    localStorage.setItem(USER_KEY_EXPIRY, String(Date.now() + ttlMs));
  } catch {
    // localStorage 저장 실패 -- 메모리 캐시만 유지
  }
}

// --- 로컬 ID fallback ---
function getOrCreateLocalUserId(): string {
  try {
    let localId = localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!localId) {
      localId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(LOCAL_USER_ID_KEY, localId);
    }
    return localId;
  } catch {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

function fallbackToLocalId(): string {
  const localId = getOrCreateLocalUserId();
  cachedUserKey = localId;
  return localId;
}

// --- Edge Function 통신 ---
async function exchangeAuthCode(authorizationCode: string): Promise<string> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ authorizationCode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.userKey;
}

// --- 메인 초기화 ---
export async function initializeUserIdentity(): Promise<string> {
  // 1. 메모리/localStorage 캐시 확인
  const cached = getCachedUserKey();
  if (cached) return cached;

  // 2. AIT 환경이면 appLogin 플로우
  if (isAppsInTossEnvironment()) {
    try {
      const loginResult = await appLogin();

      // SDK 미지원 (앱 버전 낮음)
      if (!loginResult) {
        console.warn('[userIdentity] appLogin 미지원 앱 버전');
        return fallbackToLocalId();
      }

      const { authorizationCode } = loginResult;

      // Edge Function으로 토큰 교환
      const userKey = await exchangeAuthCode(authorizationCode);
      setCachedUserKey(userKey);
      return userKey;
    } catch (err) {
      console.warn('[userIdentity] appLogin 플로우 실패:', err);
      return fallbackToLocalId();
    }
  }

  // 3. 비AIT 환경
  return fallbackToLocalId();
}

// --- Public API (하위 호환) ---
export async function getUserId(): Promise<string> {
  if (cachedUserKey) return cachedUserKey;
  return initializeUserIdentity();
}

export function getCachedUserId(): string | null {
  return cachedUserKey;
}

export function resetUserIdentityCache(): void {
  cachedUserKey = null;
  try {
    localStorage.removeItem(USER_KEY_CACHE);
    localStorage.removeItem(USER_KEY_EXPIRY);
  } catch {
    // localStorage 접근 실패
  }
}
```

#### 4.3 Public API 변경 사항

| 함수 | 변경 | 하위 호환 |
|------|------|----------|
| `initializeUserIdentity()` | 내부 구현 변경 (getUserKeyForGame -> appLogin) | 동일 시그니처 `() => Promise<string>` |
| `getUserId()` | 변경 없음 | 동일 |
| `getCachedUserId()` | 변경 없음 | 동일 |
| `isAppsInTossEnvironment()` | 내부 감지 방식 변경 (appLogin 기반) | 동일 시그니처 `() => boolean` |
| `resetUserIdentityCache()` | 새 캐시 키 정리 추가 | 동일 |

**영향받는 파일:**

| 파일 | import | 변경 필요 |
|------|--------|----------|
| `src/main.tsx` | `initializeUserIdentity` | 없음 (인터페이스 동일) |
| `src/infrastructure/rankingService.ts` | `getUserId`, `isAppsInTossEnvironment` | 없음 (인터페이스 동일) |
| `src/domain/services/promotionService.ts` | (현재 미사용) | 없음 (Cycle 2에서 전환) |
| `src/infrastructure/__tests__/rankingService.test.ts` | `getUserId` mock | mock 대상 모듈 경로 동일 |

#### 4.4 마이그레이션 전략

기존 `getUserKeyForGame` 기반 hash 값과 새로운 appLogin userKey는 다른 값이다.

| 항목 | getUserKeyForGame hash | appLogin userKey |
|------|----------------------|------------------|
| 형식 | SHA-256 해시 문자열 | 토스 유저 고유키 |
| 동일 사용자 동일성 | O (같은 해시) | O (같은 userKey) |
| 두 값 간 매핑 | 불가 (해시는 역산 불가) | N/A |

**결정:** 이번 사이클에서는 userKey로 새로 시작한다. 기존 hash 기반 game_records/user_profiles는 Cycle 3에서 마이그레이션 전략을 별도로 수립한다.

---

### 5. 세션/토큰 관리 전략

#### 5.1 토큰 저장 위치

| 토큰 | 저장 위치 | 이유 |
|------|----------|------|
| AccessToken | Supabase DB (서버 측 only) | 클라이언트 노출 시 토스 API 직접 호출 가능 -- 보안 위험 |
| RefreshToken | Supabase DB (서버 측 only) | AccessToken 재발급 용도, 반드시 서버 보관 |
| userKey | 클라이언트 localStorage + 메모리 | 사용자 식별자로만 사용, 민감도 낮음 |

#### 5.2 서버 측 토큰 스키마

```sql
-- math_attack.user_sessions: 서버 측 토큰 저장
CREATE TABLE math_attack.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_sessions_user_key_unique UNIQUE (user_key)
);

-- RLS: Edge Function(service_role)만 접근 가능
ALTER TABLE math_attack.user_sessions ENABLE ROW LEVEL SECURITY;

-- service_role만 CRUD 가능 (anon key로는 접근 불가)
CREATE POLICY user_sessions_service_only
  ON math_attack.user_sessions
  FOR ALL
  USING (auth.role() = 'service_role');
```

#### 5.3 토큰 갱신 전략

```
클라이언트 userKey 캐시 TTL (50분)
  |--- 만료 --> initializeUserIdentity() 재호출
                    |--- appLogin() -> authorizationCode
                    |--- Edge Function 호출
                          |--- user_sessions에서 기존 refreshToken 조회
                          |--- (선택) refreshToken으로 토큰 갱신 시도
                          |       |--- 성공: 새 accessToken 저장, userKey 반환
                          |       |--- 실패: 새 authorizationCode로 generate-token
                          |--- (기본) authorizationCode로 generate-token
                          |--- 새 토큰 저장, userKey 반환
```

**이번 사이클 범위:** 기본 플로우(authorizationCode -> generate-token)만 구현. RefreshToken 기반 토큰 갱신은 Cycle 4에서 구현한다.

#### 5.4 캐시 무효화

| 이벤트 | 동작 |
|--------|------|
| localStorage TTL 만료 | 자동으로 initializeUserIdentity() 재실행 |
| 앱 재시작 | localStorage 캐시 유효하면 재사용, 아니면 재인증 |
| Edge Function 토큰 만료 | DB의 token_expires_at 기준으로 재발급 |
| 사용자 변경 (다른 토스 계정) | appLogin이 다른 authorizationCode 발급 -> 자동 처리 |

---

### 6. 비AIT 환경 fallback (웹 브라우저에서의 동작)

#### 6.1 동작 방식

```
isAppsInTossEnvironment() === false
  -> appLogin() 호출하지 않음
  -> localStorage에 local-{timestamp}-{random} 생성
  -> 이 ID로 게임 기록, 랭킹 등 로컬 식별
```

#### 6.2 fallback 환경 목록

| 환경 | 동작 | 제한 사항 |
|------|------|----------|
| Vercel 배포 (웹 브라우저) | localStorage fallback | cross-device 식별 불가, 프로모션 불가 |
| Vite 개발 서버 (localhost) | localStorage fallback | 개발/테스트용 |
| 앱인토스 (토스 앱 내) | appLogin 인증 | 정상 동작 |
| 앱인토스 (구버전 토스 앱) | appLogin 미지원 -> fallback | SDK 업데이트 필요 |

#### 6.3 개발자 경험

개발 시 `VITE_MOCK_USER_KEY` 환경변수를 설정하면 appLogin을 건너뛰고 해당 값을 userKey로 사용한다.

```typescript
// 개발 모드에서만 동작하는 mock
if (import.meta.env.DEV && import.meta.env.VITE_MOCK_USER_KEY) {
  const mockKey = import.meta.env.VITE_MOCK_USER_KEY;
  setCachedUserKey(mockKey);
  return mockKey;
}
```

---

### Scope (MoSCoW)

**Must have:** (~60% of effort)
- `appLogin()` 호출 및 authorizationCode 획득 (클라이언트)
- Supabase Edge Function `auth` 생성 (mTLS 통신)
- generate-token API 호출 및 userKey 추출
- `userIdentity.ts` 리팩토링 (appLogin 기반)
- localStorage 캐시 (TTL 포함)
- 비AIT 환경 fallback 유지
- 기본 에러 처리 (appLogin 실패, Edge Function 실패, 토스 API 에러)

**Should have:**
- `user_sessions` 테이블 생성 및 토큰 서버 측 저장
- Edge Function CORS 설정
- 요청 유효성 검증 (authorizationCode 형식 체크)
- 구조화된 에러 코드 체계

**Could have:**
- RefreshToken 기반 토큰 갱신 (Cycle 4로 이동 가능)
- `VITE_MOCK_USER_KEY` 개발자 편의 기능
- Edge Function 로깅/모니터링

**Won't have (this cycle):**
- RefreshToken 자동 갱신 로직 -- Cycle 4에서 구현
- 프로모션 서버 API -- Cycle 2에서 구현
- 랭킹 시스템 userKey 전환 -- Cycle 3에서 구현
- game_records/user_profiles 마이그레이션 -- Cycle 3에서 구현
- Edge Function rate limiting -- 트래픽 증가 시 별도 구현

---

## Riskiest Assumptions

| # | Assumption | Category | Risk | How We Test | Result |
|---|-----------|----------|------|-------------|--------|
| 1 | Supabase Edge Function(Deno)에서 `Deno.createHttpClient`로 mTLS 통신이 가능하다 | Feasibility | **HIGH** | 2시간 타임박스 스파이크: Edge Function에서 mTLS 테스트 서버로 요청 전송 | (pending) |
| 2 | `appLogin()`이 비게임 카테고리에서 정상 동작한다 | Feasibility | **MEDIUM** | AIT 개발 환경에서 appLogin 호출 테스트 | (pending) |
| 3 | authorizationCode -> generate-token 토큰 교환이 10분 내에 완료된다 | Feasibility | LOW | Edge Function 응답 시간 측정 (target: <3초) | (pending) |
| 4 | 사용자가 자동 로그인 지연(~1-2초)을 허용한다 | Usability | LOW | 기존 getUserKeyForGame도 비동기였으므로 동일 UX | (validated -- 기존 패턴과 동일) |

---

## Success Metrics

### OKR

**Objective:** 비게임 전환 후에도 모든 사용자가 끊김 없이 식별되어 핵심 기능을 사용할 수 있다.

1. KR: AIT 환경 사용자 식별 성공률 -- Baseline: 0% (getUserKeyForGame 차단) / Target: 99%+ / Timeline: Cycle 1 완료 후 즉시
2. KR: 인증 플로우 평균 소요 시간 -- Baseline: N/A / Target: <3초 / Timeline: Cycle 1 완료 후 즉시
3. KR: Edge Function 에러율 -- Baseline: N/A / Target: <1% / Timeline: 배포 후 1주

### North Star Connection

**Project North Star:** Weekly Active Users (주간 활성 사용자 수)
-- 이 인프라가 구축되어야 사용자 식별 -> 랭킹/프로모션 -> 리텐션/수익화 체인이 복원된다. 인증 인프라 없이는 사용자 추적 자체가 불가하므로 North Star 측정의 전제 조건이다.

### Leading Indicators

| Metric | Expected Direction | Early Signal Of |
|--------|-------------------|-----------------|
| appLogin() 호출 성공률 | 95%+ | SDK/AIT 환경 호환성 |
| Edge Function 응답 시간 (p95) | <2초 | 사용자 체감 지연 |
| localStorage fallback 비율 | AIT에서 <5% | 인증 실패율 |

### Guardrail Metrics (Must Not Regress)

| Metric | Current | Do Not Cross |
|--------|---------|--------------|
| 앱 초기 로딩 시간 | ~1.5초 | 3초 |
| 번들 사이즈 (gzip) | ~380KB | 500KB (AIT 제한) |
| 기존 테스트 통과율 | 100% | 100% |

---

## Acceptance Criteria

### Happy Path

- [ ] **AC-1:** Given AIT 환경에서 앱을 실행할 때, When initializeUserIdentity()가 호출되면, Then appLogin() -> Edge Function -> userKey 순서로 진행되어 유효한 userKey(비어있지 않은 문자열)가 반환된다.
- [ ] **AC-2:** Given 유효한 authorizationCode가 Edge Function에 전달될 때, When generate-token API가 성공하면, Then `{ userKey, expiresAt }` 형식의 JSON 응답이 200으로 반환된다.
- [ ] **AC-3:** Given userKey가 캐싱된 상태에서, When getUserId()를 호출하면, Then appLogin()/Edge Function을 다시 호출하지 않고 캐시된 값을 즉시 반환한다.

### Error Cases

- [ ] **AC-4:** Given appLogin()이 실패(예외 또는 undefined 반환)할 때, When initializeUserIdentity()가 처리하면, Then localStorage fallback ID(`local-` 접두사)가 반환되고 console.warn이 출력된다.
- [ ] **AC-5:** Given Edge Function이 500 에러를 반환할 때, When 클라이언트가 이를 수신하면, Then localStorage fallback ID가 반환되고 앱은 정상 동작한다(게임 플레이 가능).
- [ ] **AC-6:** Given 만료된 authorizationCode가 Edge Function에 전달될 때, When 토스 API가 에러를 반환하면, Then Edge Function은 `{ error: 'EXPIRED_AUTH_CODE' }` 형식으로 400 응답을 반환한다.

### Edge Cases

- [ ] **AC-7:** Given 비AIT 환경(웹 브라우저)에서, When initializeUserIdentity()가 호출되면, Then appLogin()을 호출하지 않고 localStorage fallback ID가 반환된다.
- [ ] **AC-8:** Given userKey 캐시의 TTL이 만료된 상태에서, When getUserId()를 호출하면, Then appLogin() 플로우가 다시 실행되어 새로운 userKey가 발급된다.
- [ ] **AC-9:** Given Edge Function의 mTLS 인증서 환경변수가 누락된 상태에서, When 토큰 교환을 시도하면, Then Edge Function은 `{ error: 'SERVER_CONFIG_ERROR' }` 형식으로 500 응답을 반환한다(인증서 값 자체는 로그에 노출하지 않는다).

### Non-Functional

- [ ] **AC-10:** Given 정상 네트워크 환경에서, When 전체 인증 플로우(appLogin -> Edge Function -> 토스 API -> 응답)가 실행되면, Then 총 소요 시간이 3초 이내이다.
- [ ] **AC-11:** Given userIdentity.ts가 변경된 후, When 기존 단위 테스트를 실행하면, Then 모든 테스트가 통과한다(인터페이스 하위 호환 유지).
- [ ] **AC-12:** Given 빌드가 완료된 후, When 번들 사이즈를 측정하면, Then gzip 500KB를 초과하지 않는다.

---

## Task Breakdown

### Phase 1: 스파이크 및 환경 설정

| # | Task | Size | Deps | Parallelizable |
|---|------|------|------|----------------|
| 1 | **[스파이크] Supabase Edge Function에서 mTLS 통신 가능 여부 검증** -- Deno.createHttpClient로 mTLS 테스트 서버에 요청 전송. 2시간 타임박스. 불가 시 대안(node-fetch + https.Agent, 외부 프록시 등) 문서화. | M | none | -- |
| 2 | **[스파이크] AIT 개발 환경에서 appLogin() 호출 테스트** -- 비게임 카테고리 앱에서 appLogin 반환값 확인 (authorizationCode, referrer). | S | none | Task 1과 병렬 |

### Phase 2: Edge Function 구현

| # | Task | Size | Deps | Parallelizable |
|---|------|------|------|----------------|
| 3 | **Supabase Edge Function `auth` 디렉토리 및 기본 구조 생성** -- `supabase/functions/auth/index.ts`, `_shared/` 디렉토리, CORS 설정, 요청 검증. | S | 1 (mTLS 가능 확인) | -- |
| 4 | **mTLS 토스 API 클라이언트 구현** (`_shared/toss-api-client.ts`) -- 환경변수에서 인증서 로드, mTLS fetch wrapper, generate-token 호출. | M | 3 | -- |
| 5 | **토큰 교환 핸들러 구현** (`auth/index.ts`) -- authorizationCode 수신, generate-token 호출, userKey 추출, 응답 반환. 에러 코드 매핑. | M | 4 | -- |
| 6 | **user_sessions 테이블 마이그레이션 SQL 작성** -- CREATE TABLE, RLS 정책, UNIQUE 제약조건. | S | none | Task 3~5와 병렬 |

### Phase 3: 클라이언트 리팩토링

| # | Task | Size | Deps | Parallelizable |
|---|------|------|------|----------------|
| 7 | **userIdentity.ts 테스트 작성** (TDD Red) -- appLogin 성공, appLogin 실패, Edge Function 실패, 캐시 히트, 캐시 만료, 비AIT 환경 시나리오. | M | 2 (appLogin 동작 확인) | Task 6과 병렬 |
| 8 | **userIdentity.ts 리팩토링** (TDD Green) -- appLogin 기반으로 전환. 기존 getUserKeyForGame 제거. exchangeAuthCode 함수. | M | 7 | -- |
| 9 | **테스트 리팩토링** (TDD Refactor) -- 중복 제거, mock 정리, edge case 보강. | S | 8 | -- |
| 10 | **main.tsx 통합 확인** -- initializeUserIdentity() 호출이 새 플로우로 정상 동작하는지 확인. 기존 import 경로 유지. | S | 8 | -- |

### Phase 4: 통합 및 검증

| # | Task | Size | Deps | Parallelizable |
|---|------|------|------|----------------|
| 11 | **Supabase 환경변수 설정** -- 프로젝트 대시보드에서 TOSS_MTLS_CERT, TOSS_MTLS_KEY, TOSS_MTLS_CA, TOSS_APP_KEY, TOSS_API_BASE_URL 등록. | S | 5 | -- |
| 12 | **Edge Function 배포 및 수동 통합 테스트** -- supabase functions deploy auth. AIT 개발 환경에서 전체 플로우 수동 검증. | M | 11 | -- |
| 13 | **기존 테스트 전체 실행 및 수정** -- rankingService.test.ts 등 기존 테스트가 새 userIdentity와 호환되는지 확인. | S | 8 | Task 12와 병렬 |
| 14 | **번들 사이즈 확인** -- 빌드 후 gzip 사이즈 500KB 미만 확인. | S | 8 | Task 12와 병렬 |

---

## Dependencies & Risks

| Dependency/Risk | Impact if Delayed/Realized | Mitigation |
|-----------------|---------------------------|------------|
| **mTLS 인증서 발급** (앱인토스 콘솔) | Edge Function 배포 불가 | 개발 중 자체 서명 인증서로 스파이크, 프로덕션 인증서는 병렬 신청 |
| **Deno mTLS 지원 여부** | Edge Function 구현 방식 전면 변경 | 스파이크(Task 1)에서 조기 검증. 대안: Cloudflare Worker, Vercel Edge Function |
| **appLogin SDK 호환성** | 클라이언트 인증 불가 | 스파이크(Task 2)에서 조기 검증. Fallback: 기존 localStorage 방식 유지 |
| **토스 파트너 API 가용성** | 인증 플로우 전체 중단 | 에러 시 localStorage fallback. 재시도 로직. |
| **Supabase Edge Function cold start** | 첫 요청 지연(~1-2초) | 캐시 TTL을 충분히 길게 설정하여 재인증 빈도 최소화 |

---

## Release Strategy

- **Rollout:** Feature flag 없이 배포. 비AIT 환경에서는 기존 fallback이 동작하므로 위험 없음. AIT 환경에서만 새 플로우 적용.
- **Rollback Plan:** appLogin 플로우 실패 시 자동으로 localStorage fallback이 동작하므로 코드 롤백 없이도 앱은 동작. 심각한 문제 발견 시 Edge Function만 비활성화하면 전체가 fallback으로 전환됨.
- **Rollback Trigger:** AIT 환경에서 fallback 비율이 50%를 초과하면 Edge Function 점검.
- **Communication:** 사용자에게 별도 안내 불필요 (자동 로그인, UI 변경 없음).

---

## Decision Log

| Date | Decision | Alternatives Considered | Rationale |
|------|----------|------------------------|-----------|
| 2026-02-24 | 서버를 Supabase Edge Function으로 선택 | NestJS 별도 서버, Vercel Edge Function, Cloudflare Worker | 이미 Supabase 인프라 사용 중. 별도 서버 운영 비용 없음. 환경변수로 인증서 관리 용이. |
| 2026-02-24 | AccessToken/RefreshToken은 서버 측에만 저장 | 클라이언트 암호화 저장, httpOnly 쿠키 | 앱인토스 환경에서 쿠키 지원 불확실. 클라이언트 저장은 보안 위험. 서버 저장이 가장 안전. |
| 2026-02-24 | userKey만 클라이언트에 전달 | 전체 토큰 반환, 세션 ID 반환 | userKey는 식별자이지 인증 토큰이 아님. 노출되어도 토스 API 직접 호출 불가. 기존 hash와 동일한 역할. |
| 2026-02-24 | 기존 hash 기반 데이터 마이그레이션은 Cycle 3으로 연기 | 이번 사이클에서 함께 처리 | 마이그레이션은 별도 복잡도. 이번 사이클은 인프라 구축에 집중. hash -> userKey 매핑 자체가 불가(해시 역산 불가). |
| 2026-02-24 | RefreshToken 갱신 로직은 Cycle 4로 연기 | 이번 사이클에서 함께 구현 | 기본 플로우(authorizationCode -> generate-token)만으로 동작 가능. 갱신은 최적화 단계. |

---

## Open Questions

1. **Deno.createHttpClient의 mTLS 지원 상태:** Supabase Edge Function 프로덕션 환경에서 안정적으로 동작하는가? Deno Deploy에서 지원하는가? -- **Task 1 스파이크에서 검증 필수.**
2. **appLogin()의 반환 타입:** SDK 문서에 `{ authorizationCode, referrer }` 외에 에러 케이스(undefined, 'ERROR' 등)의 정확한 형태는? -- **Task 2 스파이크에서 확인.**
3. **generate-token 응답의 userKey 위치:** AccessToken JWT payload의 어느 필드에 userKey가 포함되는가? (`sub`, `userKey`, 기타) -- **토스 파트너 API 문서 확인 또는 실제 응답에서 확인 필요.**
4. **mTLS 인증서 갱신 주기:** 인증서 만료 시 자동 갱신이 가능한가, 수동으로 교체해야 하는가? -- 앱인토스 콘솔 문서 확인 필요.
5. **Edge Function cold start 시간:** Supabase Edge Function의 cold start가 3초 이내인가? -- 배포 후 측정.

---

## Out of Scope

- 프로모션 서버 API 구현 (Cycle 2)
- 랭킹 시스템 userKey 전환 및 데이터 마이그레이션 (Cycle 3)
- RefreshToken 자동 갱신 (Cycle 4)
- Edge Function rate limiting / DDoS 방어
- 사용자 프로필 UI 변경
- 다중 디바이스 세션 관리
- appLogin 실패 시 사용자 알림 UI (현재는 silent fallback)
