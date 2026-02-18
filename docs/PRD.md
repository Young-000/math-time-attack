# 구구단 챌린지 (Math Time Attack) - PRD

> v1.0 | 최초 작성: 2026-02-13

## 프로젝트 목적

앱인토스(Apps-in-Toss) 플랫폼에서 구구단 연습을 게임화하여 제공한다. 난이도별 문제 풀기, 타임어택 모드, 랭킹 시스템으로 반복 학습을 유도하며, 보상형 광고(추가 시간, 하트 충전)로 수익화한다.

## 타겟 사용자

- 토스 앱 사용자 중 간단한 두뇌 게임을 즐기려는 사용자
- 구구단/수학 연습이 필요한 학생 및 학부모
- 랭킹 경쟁을 즐기는 게임 사용자

## 핵심 기능

1. **난이도별 게임**: easy(구구단 2-5단), medium(6-9단), hard(혼합/복합 연산)
2. **타임어택 모드**: 제한 시간 내 최대한 많은 문제 풀기, 보상형 광고로 +10초 획득
3. **하트 시스템**: 게임 시작 시 하트 1개 소모, 광고 시청으로 충전 가능
4. **랭킹 시스템**: Supabase 기반 난이도별/전체 랭킹
5. **닉네임 관리**: user_profiles 테이블로 닉네임 설정/변경
6. **보상형 광고**: GoogleAdMob 연동 (추가 시간, 하트 충전)

## 비기능 요구사항

- 앱인토스 가이드라인 준수 (라이트 모드, 핀치 줌 비활성화, 응답 2초 이내)
- TDS (Toss Design System) 컴포넌트 우선 사용
- Clean Architecture 패턴 적용
- 단위 테스트 80% 이상 커버리지 목표
- AIT 파일 빌드 및 배포 지원

## 기술 스택

- Frontend: React 18 + Vite 5 + TypeScript 5.3
- UI: @toss/tds-mobile (Toss Design System)
- Platform: @apps-in-toss/web-framework
- Database: Supabase (PostgreSQL) - math_attack 스키마
- 광고: GoogleAdMob (앱인토스 SDK)
- 테스트: Vitest + RTL (단위) + Playwright (E2E)
- 배포: Vercel (웹) + AIT 파일 (앱인토스)

## 향후 방향

- 연산 종류 확장 (나눗셈, 분수 등)
- 친구 대결 모드
- 일일 미션/스트릭 시스템
- 학습 통계 대시보드
- fix 브랜치 -> main 머지 및 정기 릴리즈

---

*마지막 업데이트: 2026-02-13*
