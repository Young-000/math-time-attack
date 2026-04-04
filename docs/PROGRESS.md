# 구구단 챌린지 (Math Time Attack) - 진행 기록

## 현재 상태

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
