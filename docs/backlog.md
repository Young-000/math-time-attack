# Backlog — Math Time Attack 야간 자율 사이클

> 형식: `- [ ] <태스크> (근거: <한 줄>)`
> 금지: 돈 지출·외부 노출·DB 스키마 변경·배포 설정 변경·게임 이코노미 수치 변경

## Active

- [ ] vitest.config.ts에 `.worktrees/**` 제외 추가 후 src 테스트 수복 — promotionService `resetPromotionClaims` export 누락 및 userIdentity/fallback 통합 테스트 mock 정비 (근거: verify.sh test 단계 RED — 고아 worktree 스캔으로 테스트 중복 실행·hang, 메인 src 33개 테스트 실패)
- [ ] deprecated `useRewardedAd.ts` 훅을 HeartStation·TimeAttackPage에서 v2 API(`loadFullScreenAd`/`showFullScreenAd`)로 교체 (근거: CLAUDE.md Known Issues — SDK 업그레이드 시 브레이킹 위험, v1 래퍼 2개 파일 잔존)
- [ ] `.worktrees/toss-login-mandatory` 고아 worktree 디렉토리 정리 및 `.gitignore`에 `.worktrees/` 추가 (근거: git status fatal error 발생 — protect-main·auto-push 훅 전체 영향)

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
