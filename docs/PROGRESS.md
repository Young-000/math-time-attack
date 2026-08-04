# 구구단 챌린지 (Math Time Attack) - 진행 기록

## 현재 상태

- 2026-08-04 `f556c9f` fix(economy): v3 리워드 하향 — 보상형 광고 실단가 0.2원 대응


- 2026-05-18 `5ee2c77` feat(math-time-attack): apply 100P exchange cap (track-1 standard)
- 2026-05-18 `7d9993a` chore(math-time-attack): pin sdk @2.5.1
- 2026-05-17 `a149221` feat(privacy): wire terms/privacy consent flow (P0 console gap)
- 2026-04-06 `830f875` fix: getCachedUserId가 localStorage도 읽도록 수정
- 2026-04-06 `1fdd50b` fix: remove isAppsInTossEnvironment gate from appLogin
- 2026-04-06 `0b9030a` fix: 비게임 출시가이드 체크리스트 수정
- 2026-04-05 `fbe6349` fix: full review issues — ads, currency, auth, UX fixes
- 2026-04-05 `ce37e5b` fix: replace unicode escapes with actual Korean/emoji characters
- 2026-04-05 `5aeae52` fix: add backEvent + closeView, remove custom back buttons for console review compliance
- 2026-03-29 `6255b99` fix: ISSUES.md 전체 수정 — 난이도 범위 분리, 홈 리다이렉트, 배너 광고, 교환 통일, HoF 유니코드 수정
- 2026-03-29 `82c0dfd` fix(math-time-attack): UI/UX 이슈 수정 (더블체크)
- 2026-03-28 `4f2e753` fix(math-time-attack): 환경체크 제거 + 이슈 수정
- 2026-03-22 `7a24272` fix(auth): Toss login compliance - UNLINK 3 referrers, refresh token, Edge Function refresh
- 2026-03-22 `223c1f8` chore: mark toss point exchange as TBD across all apps
- 2026-03-22 `1fce68c` feat(economy): rebalance daily economics to target ~1000 stars/day and ~30 won revenue
- 2026-03-22 `4f91ea2` feat(economy): redesign reward economics - 100 per rewarded ad, 50 daily login, mission rewards 50/60/80/100/150
- 2026-03-22 `8027c90` fix(math-time-attack): localStorage fallback + exchange rate 100:1
- 2026-03-22 `d649f7e` fix: remove ad pre-notice toast, fix UNLINK data cleanup scope, fix meta tags
- 2026-03-21 `9783a09` fix(math-time-attack): mission coin credit + viewport-fit
- 2026-03-21 `23d4307` fix(math-time-attack): critical bugs — exchange flow, granite host, init await, clearData
- 2026-03-21 `b40687f` fix(math-time-attack): address AIT review rejection issues — exitApp, UNLINK, interstitial alert
- 2026-03-17 `aa6e8e1` fix(exchange): use promotion Edge Function instead of nonexistent exchange endpoint
- 2026-03-16 `5c49ff9` feat: progressive stage missions + reward effects
- 2026-03-16 `34d5586` feat(pages): add mission button to home, track exchange for missions, update labels
- 2026-03-16 `695dfe3` feat(result): integrate missions and remove direct Toss point promotion


- 완성도: 95%
- 상태: 활발히 개발 중 (fix/code-review-improvements 브랜치)

## 마일스톤

### v1.0 (완료)

- [x] 프로젝트 초기화 (Vite + TypeScript + Clean Architecture)
- [x] 게임 엔진 구현
  - 난이도별 문제 생성기 (easy/medium/hard)
  - 연산 모드 (addition/multiplication/mixed)
- [x] 타임어택 모드
- [x] 하트 시스템
  - 게임 시작 시 소모
  - 광고 시청으로 충전
  - 하트 부족 모달
- [x] 랭킹 시스템 (Supabase)
- [x] 닉네임 관리 (user_profiles)
- [x] 보상형 광고 연동 (GoogleAdMob)
  - +10초 (타임어택)
  - 하트 충전
- [x] 앱인토스 TDS UI 적용
- [x] 단위 테스트 268개
- [x] E2E 테스트 5개 (Playwright)
- [x] Vercel 배포

### v1.1 - Full Ecosystem Integration (현재)

- [x] v2 광고 API 마이그레이션 (loadFullScreenAd/showFullScreenAd)
- [x] 전면 광고 + 보상형 광고 빈도 제어
- [x] 하트 경제 리밸런싱 (MAX 3, 30분 충전, +1/+2)
- [x] 업적 시스템 (7개 업적, 하트 보상)
- [x] 기간별 랭킹 (일간/주간/월간/전체)
- [x] Game Center SDK 연동 (리더보드)
- [x] 일일 로그인 보너스
- [ ] .granite/app.json 수정사항 커밋
- [ ] main 브랜치 머지

### v1.2 (계획)

- [ ] 연산 종류 확장 (나눗셈 등)
- [ ] 친구 대결 모드
- [ ] 세그먼트/푸시 알림 (앱인토스 콘솔)

## 작업 이력

| 날짜 | 작업 내용 | 비고 |
|------|----------|------|
| 2026-02-18 | v2 광고 API 마이그레이션 + 하트 리밸런싱 + 업적/Game Center/기간별 랭킹 | Full Ecosystem Integration |
| 2026-02-13 | 문서 표준화 (CLAUDE.md, PRD, PROGRESS, TROUBLESHOOTING) | - |
| 2026-02-12 | 코드 리뷰 개선사항 반영 | fix/code-review-improvements 브랜치 |
| - | Clean Architecture 구조 설계 | - |
| - | 게임 엔진, 하트 시스템, 랭킹 시스템 구현 | - |
| - | 앱인토스 TDS UI, 보상형 광고 연동 | - |

## [2026-02-18] Full Ecosystem Integration

### 완료
- feat: v2 Full Screen Ad API 마이그레이션 (useFullScreenAd 훅)
- feat: 전면 광고 훅 (useInterstitialAd) + 빈도 제어 서비스
- feat: 하트 경제 리밸런싱 (MAX 5→3, 1시간→30분, 풀충전→+1/+2)
- feat: 업적 시스템 (7개 업적, 하트 보상, AchievementModal)
- feat: 기간별 랭킹 확장 (일간/주간/월간/전체)
- feat: Game Center SDK 연동 (useGameCenter 훅)
- feat: 일일 로그인 보너스 (DifficultySelectPage)
- refactor: AdBanner/AdInterstitial → 앱인토스 네이티브 광고로 전환
- chore: test/setup.ts v2 API 글로벌 mock 추가

### 다음 단계
- [ ] .granite/app.json + 전체 변경사항 커밋
- [ ] fix 브랜치 → main 머지
- [ ] Vercel 재배포 후 프로덕션 확인
- [ ] 앱인토스 콘솔에서 세그먼트/푸시 설정

---

## [2026-03-31] 코드 리뷰 (TEA-44)

### 발견된 이슈
- [critical] UTC 타임존 — 6개 파일에서 UTC 기반 일일 리셋, KST 미반영
- [critical] 테스트 71개 실패 + OOM 2건 — .worktrees 디렉토리 누수로 메모리 초과
- [critical] Exchange stale closure — 클로저가 이전 상태를 참조하여 잘못된 교환 수행, 롤백 미구현
- [critical] heartService 파라미터 불일치 — CLAUDE.md 문서와 실제 구현이 다름
- [critical] 광고 제한 불일치 — 코드와 설정 간 광고 일일 제한 횟수 불일치

### 번들 상태
- 128KB — 500KB 제한 대비 우수

### 다음 단계
- [ ] UTC → KST 타임존 처리 6개 파일 수정
- [ ] .worktrees 디렉토리 정리 및 테스트 환경 OOM 해결
- [ ] 실패 테스트 71개 수정
- [ ] Exchange 클로저 문제 해결 + 교환 실패 시 롤백 로직 추가
- [ ] heartService 파라미터를 CLAUDE.md와 코드 간 동기화
- [ ] 광고 제한 횟수 코드/설정 통일

---

*마지막 업데이트: 2026-03-31*
