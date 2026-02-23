# 구구단 챌린지 (Math Time Attack)

구구단 연습 앱 (앱인토스 일반 앱 — 비게임 카테고리)

## Overview

| 항목 | 값 |
|------|-----|
| 배포 URL | https://math-time-attack.vercel.app |
| Supabase | Project 1 - `ayibvijmjygujjieueny` |
| 스키마 | `math_attack` |
| 브랜치 | `feature/cleanup-deploy` |
| 완성도 | 100% |

## 기술 스택

- React 18 + Vite 5 + TypeScript 5.3
- Apps-in-Toss (@apps-in-toss/web-framework, @toss/tds-mobile)
- Supabase (PostgreSQL + Edge Functions)
- Clean Architecture
- Vitest + RTL (325 단위 테스트) + Playwright E2E (5 스펙)

## 앱인토스 개발 필수 규칙

> 이 프로젝트는 앱인토스(Apps-in-Toss) 미니앱입니다. **비게임 카테고리**.

### TDS 컴포넌트 사용 필수

- UI/UX 수정 전 TDS 문서 검색 우선
- CSS로 직접 구현하기 전에 TDS 컴포넌트 존재 여부 확인
- `@toss/tds-mobile` 패키지의 컴포넌트 우선 사용

| 용도 | 컴포넌트 | import |
|------|----------|--------|
| 하단 고정 버튼 | `FixedBottomCTA` | `@toss/tds-mobile` |
| 키보드 위 고정 | `fixedAboveKeyboard={true}` | prop |
| 텍스트 입력 | `TextField` | `@toss/tds-mobile` |
| 버튼 | `Button`, `CTAButton` | `@toss/tds-mobile` |

## 비게임 인증 아키텍처 (Cycle 1–4 리뉴얼)

### 배경

앱인토스 비게임 카테고리에서는 `getUserKeyForGame()`이 `INVALID_CATEGORY`를 반환한다.
따라서 `appLogin()` + Supabase Edge Function(mTLS) + 토스 파트너 API 방식으로 전환했다.

### 인증 플로우

```
appLogin() → authorizationCode
  → Edge Function /functions/v1/auth (mTLS)
  → 토스 파트너 API (AccessToken + RefreshToken)
  → userKey 추출 → 클라이언트 캐싱 (50분 TTL)
```

### 관련 파일

| 파일 | 역할 |
|------|------|
| `src/infrastructure/userIdentity.ts` | appLogin + Edge Function 연동, userKey 캐싱 |
| `src/infrastructure/rankingService.ts` | userKey 기반 랭킹 조회/업데이트 |
| `src/domain/services/promotionService.ts` | Edge Function 기반 프로모션(토스 포인트) 지급 |
| `supabase/functions/auth/index.ts` | 인증 Edge Function (mTLS 토큰 교환) |
| `supabase/functions/promotion/index.ts` | 프로모션 Edge Function (토스 포인트 지급) |

### Edge Function 환경 변수 (Supabase Secrets)

```
TOSS_PARTNER_CLIENT_ID   # 토스 파트너 클라이언트 ID
TOSS_PARTNER_CLIENT_SECRET  # 토스 파트너 시크릿
TOSS_PARTNER_MTLS_CERT   # mTLS 인증서
TOSS_PARTNER_MTLS_KEY    # mTLS 키
```

## 프로젝트 구조

```
src/
  presentation/       # 프레젠테이션 레이어
    pages/            # 페이지 컴포넌트
    components/       # UI 컴포넌트
    hooks/            # 커스텀 훅
  domain/             # 도메인 레이어
    game/             # 게임 엔진, 엔티티
    services/         # 도메인 서비스 (heart, promotion, adFrequency 등)
  data/               # 데이터 레이어
    problem/          # 문제 생성기
    record/           # 기록 서비스
  infrastructure/     # 인프라 레이어
    supabase/         # Supabase 클라이언트
    userIdentity.ts   # 비게임 인증 (appLogin 기반)
    rankingService.ts # 랭킹 서비스
  lib/                # 라이브러리
  __tests__/          # 통합 테스트
  styles/             # 스타일
supabase/
  functions/          # Edge Functions
    auth/             # 인증 (appLogin → userKey)
    promotion/        # 프로모션 지급 (토스 포인트)
  migrations/         # DB 마이그레이션
e2e/                  # Playwright E2E 테스트 (5 스펙)
```

## 광고 API (v2 Full Screen Ad) 주의사항

### v2 API 패턴 (loadFullScreenAd + showFullScreenAd)

```typescript
// load → loaded → cleanup → show (한 플로우)
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

const cleanup = loadFullScreenAd({
  options: { adGroupId: AD_GROUP_ID },
  onEvent: (event) => {
    if (event.type === 'loaded') {
      cleanup();
      showFullScreenAd({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (showEvent) => {
          switch (showEvent.type) {
            case 'userEarnedReward': // 보상 지급
            case 'dismissed':       // 광고 닫힘
            case 'failedToShow':    // 표시 실패
          }
        },
        onError: (err) => { /* 에러 처리 */ },
      });
    }
  },
  onError: (loadErr) => { /* 로드 에러 */ },
});
```

### 광고 빈도 제어

- 전면 광고: 3판마다 1회, 하루 최대 10회
- 보상형 광고: 최소 60초 간격, 하루 최대 15회
- `adFrequencyService.ts`에서 관리

### 광고 관련 파일

- `src/presentation/hooks/useFullScreenAd.ts` - v2 보상형 광고 훅
- `src/presentation/hooks/useInterstitialAd.ts` - v2 전면 광고 훅
- `src/presentation/hooks/useRewardedAd.ts` - v1 래퍼 (deprecated, HeartStation/TimeAttackPage에서 사용 중)
- `src/domain/services/adFrequencyService.ts` - 광고 빈도 제어
- `src/presentation/pages/TimeAttackPage.tsx` - 타임어택 +10초 광고
- `src/presentation/pages/ResultPage.tsx` - 결과 페이지 전면/보상형 광고
- `src/presentation/pages/DifficultySelectPage.tsx` - 난이도 선택 하트 충전 광고

## 하트 시스템 주의사항

### 게임 시작 시 하트 체크 필수

모든 게임 시작 경로에서 하트 체크 -> 소모 로직이 있어야 함:

| 경로 | 파일 | 함수 |
|------|------|------|
| 난이도 선택 -> 게임 | `DifficultySelectPage.tsx` | `tryStartGame()` |
| 결과 -> 다시하기 | `ResultPage.tsx` | `handleRetry()` |
| 타임어택 결과 -> 다시하기 | `TimeAttackResultPage.tsx` | `handleRetry()` |

### 하트 경제 (v2)

| 항목 | 값 |
|------|-----|
| 최대 하트 | 3개 |
| 자동 충전 | 30분마다 1개 |
| 광고 보상 | +1 |
| 공유 보상 | +2 |
| 일일 로그인 보너스 | +1 |
| 업적 보상 | 업적별 1~3개 |

### 주의사항

1. 직접 `navigate()` 금지: 하트 체크 없이 바로 게임 페이지로 이동하면 안 됨
2. 결과 페이지에 하트 UI 필수: 사용자가 남은 하트 확인 가능해야 함
3. 하트 부족 모달 필수: 광고/공유로 충전할 수 있는 옵션 제공

## DB 테이블

```sql
-- game_records: 게임 기록 저장
CREATE TABLE math_attack.game_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odl_id VARCHAR NOT NULL,       -- 실제로는 appLogin userKey가 저장됨 (컬럼명 유지)
  difficulty VARCHAR NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  operation VARCHAR NOT NULL CHECK (operation IN ('addition', 'multiplication', 'mixed')),
  time INTEGER NOT NULL CHECK (time > 0),
  nickname VARCHAR,
  played_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user_profiles: 닉네임 관리
CREATE TABLE math_attack.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odl_id VARCHAR UNIQUE NOT NULL,  -- 실제로는 appLogin userKey가 저장됨
  nickname VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- user_sessions: 인증 토큰 서버 측 저장 (Edge Function 전용)
-- service_role만 접근 가능 (RLS)
CREATE TABLE math_attack.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- promotion_records: 프로모션 지급 기록 (Edge Function 전용)
-- service_role만 접근 가능 (RLS), user_key + promotion_code 중복 방지
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

## 환경 변수 (.env.local)

```env
VITE_SUPABASE_URL=https://ayibvijmjygujjieueny.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
# 개발 시 userKey mock (선택)
VITE_MOCK_USER_KEY=dev-test-user-key
```

## 개발 명령어

```bash
npm install            # 의존성 설치
npm run dev            # 개발 서버 (localhost:5173)
npm run build          # 프로덕션 빌드 (웹 only)
npm run build:ait      # AIT 빌드 (필수! 아래 규칙 참고)
npm run lint           # ESLint 실행
npm run typecheck      # TypeScript 타입 검사
npm run test           # 단위 테스트 (Vitest)
npm run test:coverage  # 테스트 커버리지
npm run test:e2e       # E2E 테스트 (Playwright)
```

### AIT 빌드 규칙 (필수)

> **`npx granite build` 직접 호출 금지. 반드시 `npm run build:ait` 사용.**

| 명령어 | 결과 | 사용 |
|--------|------|------|
| `npm run build:ait` | `builds/gugudan-challenge-v{version}-{timestamp}.ait` | O (필수) |
| `npx granite build` | `gugudan-challenge.ait` (루트, 이름 규칙 미적용) | X (금지) |

- `scripts/build-ait.sh`가 granite build 후 자동으로 버전+타임스탬프 이름 변경 + `builds/` 이동
- 루트의 `*.ait` 파일은 `.gitignore`에서 차단됨
- Claude hook으로 `granite build` 직접 호출 시 차단됨

## 진행상황

- [x] 프로젝트 초기화 (Vite + TypeScript)
- [x] Clean Architecture 구조 설계
- [x] 게임 엔진 구현 (난이도별 문제 생성)
- [x] Supabase DB 연결 (math_attack 스키마)
- [x] RLS 정책 활성화
- [x] 앱인토스 TDS UI 적용
- [x] 하트 시스템 구현
- [x] 보상형 광고 연동 (GoogleAdMob)
- [x] 랭킹 시스템
- [x] 단위 테스트 325개 + E2E 5개
- [x] Vercel 배포
- [x] v2 광고 API 마이그레이션 (loadFullScreenAd/showFullScreenAd)
- [x] 하트 경제 리밸런싱 (MAX 3, 30분 충전, +1/+2)
- [x] 전면 광고 + 보상형 광고 빈도 제어
- [x] 업적 시스템 (7개 업적, 하트 보상)
- [x] 기간별 랭킹 (일간/주간/월간/전체)
- [x] Game Center SDK 연동 (리더보드)
- [x] 일일 로그인 보너스
- [x] Cycle 1: appLogin + Edge Function 인증 인프라 (비게임 전환)
- [x] Cycle 2: 프로모션 서버 API (Edge Function 기반 토스 포인트 지급)
- [x] Cycle 3: 랭킹 userKey 전환 (hash odl_id → appLogin userKey)
- [x] Cycle 4: 통합 테스트 + 에러 핸들링
- [x] Cycle 5: 레거시 정리 + CLAUDE.md 업데이트

## Known Issues (프로젝트 고유)

- `supabase.ts` 타입 경고 (Supabase SDK 제네릭 이슈, 런타임 영향 없음)
- 앱인토스 v2 광고 SDK 패턴: load → loaded → cleanup → show (한 플로우)
- `game_records.odl_id` 컬럼에 실제로는 appLogin userKey가 저장됨 (DB 마이그레이션 없이 유지)
- `useRewardedAd.ts`는 deprecated이나 HeartStation/TimeAttackPage에서 아직 사용 중

---

*전역 설정 참조: `workspace/CLAUDE.md`, `SUPABASE_RULES.md`, `APPS_IN_TOSS_GUIDELINES.md`*
