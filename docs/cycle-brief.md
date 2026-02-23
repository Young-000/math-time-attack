# Cycle 1 Brief — appLogin + mTLS 인증 인프라 구축

## 프로젝트 개요
- **이름**: 구구단 챌린지 (Math Time Attack)
- **플랫폼**: 앱인토스 (Apps-in-Toss) 비게임 미니앱
- **기술 스택**: React 18 + Vite 5 + TypeScript + Supabase + @apps-in-toss/web-framework
- **스키마**: `math_attack` (Supabase Project 1: ayibvijmjygujjieueny)

## 현재 상태
- `getUserKeyForGame()` 기반 유저 식별 → 비게임이라 사용 불가
- `grantPromotionRewardForGame()` 기반 프로모션 → 비게임이라 에러 40000
- 서버 없이 클라이언트만으로 운영 중 → mTLS 서버 API 필요

## 이번 사이클 목표
**appLogin() + Supabase Edge Function으로 비게임 인증 인프라 구축**

### 핵심 요구사항
1. 클라이언트: `appLogin()` 호출 → authorizationCode 획득
2. Supabase Edge Function: mTLS 인증서로 토스 API 서버 통신
3. 토큰 교환: authorizationCode → AccessToken → userKey 추출
4. `userIdentity.ts` 리팩토링: appLogin 기반으로 전환
5. 세션/토큰 관리 기본 구조

### API 스펙
- **appLogin()** (클라이언트): `{ authorizationCode, referrer }` 반환, 유효시간 10분
- **generate-token** (서버→토스): `POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token`
  - mTLS 필수, authorizationCode → AccessToken + RefreshToken
- **refresh-token** (서버→토스): `POST /api-partner/v1/apps-in-toss/user/oauth2/refresh-token`

### 주의사항
- mTLS 인증서는 환경변수로 Edge Function에 주입 (실제 인증서는 콘솔에서 발급)
- authorizationCode는 일회성, 10분 유효
- AccessToken, RefreshToken은 서버에서만 보관
- 기존 localStorage 캐시 기반 userIdentity와 호환 필요 (비AIT 환경 fallback)

## 파일 구조
```
src/
  infrastructure/
    userIdentity.ts        ← 리팩토링 대상 (appLogin 기반)
    rankingService.ts      ← userIdentity 의존 (이번 사이클에서는 인터페이스만 유지)
  domain/
    services/
      promotionService.ts  ← 다음 사이클에서 전환 예정
supabase/
  functions/
    auth/                  ← 새로 생성 (Edge Function)
```

## 컨벤션
- TypeScript strict, 세미콜론, 작은따옴표
- Clean Architecture 레이어 준수
- 테스트: Vitest + RTL, `{파일명}.test.ts` colocation
- AIT 번들 500KB 제한 준수
