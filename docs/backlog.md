# Backlog — mTLS 기반 비게임 전환 리뉴얼

## Next
<!-- 모든 백로그 항목 완료 -->

## Later
<!-- 추가 백로그 항목 -->

## Done
- [x] **[Cycle 5] 정리 및 배포** (PR #12)
  - 프로모션 테스트 버튼 제거
  - CLAUDE.md 비게임 전환 아키텍처 문서 추가
- [x] **[Cycle 4] 통합 테스트 및 에러 핸들링** (PR #11)
  - 통합 테스트 34개 + userIdentity 타임아웃 처리
- [x] **[Cycle 3] 랭킹 시스템 userKey 기반 전환** (PR #10)
  - rankingService 문서화 + 테스트 userKey 형식 반영
- [x] **[Cycle 2] 비게임 프로모션 서버 API 구현** (PR #9)
  - Edge Function promotion (mTLS 3단계 플로우)
  - promotionService.ts Edge Function 호출로 전환
  - promotion_records 테이블 + 서버 사이드 중복 방지
  - 단위 테스트 11 케이스
- [x] **[Cycle 1] appLogin + Supabase Edge Function 기반 인증 인프라 구축** (PR #8)
  - userIdentity.ts appLogin 기반 전환
  - Edge Function auth (mTLS 토큰 교환)
  - user_sessions 테이블 + RLS
  - 단위 테스트 20+ 케이스
