# 풀 앱인토스 생태계 통합 설계

> 날짜: 2026-02-18
> 상태: 승인됨
> 브랜치: fix/code-review-improvements 에서 분기 예정

## 배경

- 광고 보상(userEarnedReward) 콜백이 실제 환경에서 미동작
- 광고 노출 지점이 "하트 충전"에만 국한 → 수익화 기회 부족
- 리텐션은 나오고 있어 게임 자체 매력은 검증됨
- 앱인토스 공식 도구(게임센터, 푸시, 공유리워드)를 활용하지 않고 있음

## 목표

1. 광고 v2 API 마이그레이션 → 보상 미지급 버그 해결
2. 광고 지면 다양화 → 자연스러운 수익화
3. 하트 경제 리밸런싱 → 광고/공유 접점 자연 발생
4. 기간별 랭킹 + 업적 시스템 → 리텐션 강화
5. 공식 게임 프로필 & 리더보드 SDK 도입 → 바이럴 + 토스 생태계 노출
6. 세그먼트/푸시 알림 설정 → 이탈 유저 재방문

---

## 1. 광고 시스템 개편

### API 마이그레이션

| 현재 (v1 레거시) | 변경 (v2 통합) |
|-----------------|---------------|
| `GoogleAdMob.loadAppsInTossAdMob` | `loadFullScreenAd` |
| `GoogleAdMob.showAppsInTossAdMob` | `showFullScreenAd` |
| import from GoogleAdMob 객체 | import from `@apps-in-toss/web-framework` |

- 기존 `adGroupId` 그대로 재사용 가능
- v2는 전면(Interstitial) + 보상형(Rewarded) 통합 API
- 배너는 별도 `TossAds.initialize` + `BannerAdView`

### 광고 노출 지점

```
[앱 진입] ─────────────── 스플래시 후 전면 광고 (하루 첫 1회)
    │
[난이도 선택] ──────────── 하단 배너 광고 (상시)
    │
[게임 플레이] ──────────── 광고 없음 (몰입 보호)
    │
[타임어택 시간종료] ────── "광고 보고 +10초" 보상형 (v2로 수정)
    │
[결과 페이지] ──────────── ① 전면 광고 (3판마다 자동)
    │                      ② "광고 보고 하트 +1" 보상형 CTA
    │
[랭킹 페이지] ──────────── 하단 배너 광고 (상시)
    │
[업적 달성 모달] ────────── "광고 보고 보상 2배 받기" 보상형
    │                       예) 업적 하트 +1 → 광고 시 +2
    │
[하트 부족 모달] ────────── "광고 보고 +1" 보상형
    │                       "친구 초대 +2" 공유
    │
[일일 챌린지 완료] ──────── "광고 보고 추가 하트" 보상형
    │
[연속 출석 마일스톤] ────── "광고 보고 보너스 하트" 보상형
```

### 전면 광고 빈도 제어

- localStorage 기반 게임 횟수 카운트
- 3판마다 1회 전면 광고
- 하루 최대 10회 cap
- 앱 진입 전면: 하루 1회만

### 보상형 광고 쿨다운

- 최소 60초 간격 (연타 방지)
- 하루 최대 15회

---

## 2. 하트 경제 리밸런싱

| 항목 | 현재 | 변경 |
|------|------|------|
| 최대 하트 | 5개 | **3개** |
| 자동 충전 | 1시간/1개 | **30분/1개** |
| 풀충전까지 | 5시간 | **1.5시간** |
| 광고 보상 | 풀충전(5개) | **+1개** (반복 시청 유도) |
| 공유 보상 | 풀충전(5개) | **+2개** (공유 > 광고 가치) |
| 일일 챌린지 완료 | 없음 | **+1개** |
| 첫 접속 보너스 | 없음 | **풀충전(3개)** (매일 1회) |
| 업적 보상 | 없음 | **+1~3개** (업적별 상이) |

설계 원칙:
- 3개 = 연속 3판 후 반드시 충전 → 광고/공유 접점 자연 발생
- 30분 충전 = "잠깐 쉬었다 오면 다시 가능" → 세션 분리 + 재방문
- 광고 +1 = 같은 세션에서 여러 번 시청 가능
- 일일 첫접속 풀충전 = 매일 돌아올 이유

---

## 3. 기간별 랭킹 + 업적 시스템

### 기간별 랭킹 (Supabase 확장)

기존 `game_records` 테이블의 `played_at` 기반 쿼리로 구현.

| 기간 | 리셋 주기 | 동기 |
|------|----------|------|
| 일간 | 매일 자정 | "오늘 1등" |
| 주간 | 월요일 자정 | "이번 주 Top 10" |
| 월간 | 1일 자정 | "이달의 고수" |
| 전체 | 리셋 없음 | 게임센터 리더보드 연동 |

추가 인덱스:
```sql
CREATE INDEX game_records_played_at_idx ON math_attack.game_records(played_at);
```

### 업적 시스템

| 카테고리 | 업적 | 조건 | 보상 |
|----------|------|------|------|
| 첫 도전 | 첫 게임 클리어 | 1판 완료 | 하트 +1 |
| 속도왕 | 번개 클리어 | 쉬움 10초 이내 | 하트 +1 |
| 연속 정답 | 퍼펙트 스트릭 | 타임어택 20연속 | 하트 +2 |
| 꾸준함 | 7일 연속 출석 | 7일 streak | 하트 풀충전 |
| 도전자 | 올클리어 | 모든 난이도 완료 | 하트 풀충전 |
| 마스터 | 구구단 마스터 | 어려움 15초 이내 | 칭호 |
| 사교왕 | 친구 초대 | 5명 공유 | 하트 +3 |

DB:
```sql
CREATE TABLE math_attack.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odl_id VARCHAR NOT NULL,
  achievement_key VARCHAR NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(odl_id, achievement_key)
);
```

업적 달성 시:
- 달성 모달 표시
- 기본 보상 즉시 지급
- "광고 보고 보상 2배 받기" 선택지 제공

---

## 4. 공식 게임 프로필 & 리더보드 SDK

### 전환 범위

| 기능 | 현재 | SDK 전환 |
|------|------|----------|
| 프로필 | `user_profiles` 테이블 + useNickname | 토스 게임 프로필 (자동) |
| 점수 제출 | Supabase insert | `submitGameCenterLeaderBoardScore()` |
| 랭킹 UI | 자체 RankingPage | `openGameCenterLeaderboard()` (네이티브) |
| 친구 랭킹 | 없음 | SDK 자동 지원 |

### 마이그레이션 전략

- Supabase 기록 **삭제하지 않음** (기간별 랭킹 + 통계용 유지)
- 게임센터 = 전체(올타임) 랭킹
- Supabase = 일간/주간/월간 랭킹 + 업적 데이터
- 기존 RankingPage → 탭 구조: 일간|주간|월간 (Supabase) + 전체 (게임센터 버튼)

### 점수 기준

| 모드 | 점수 계산 | 높을수록 좋음 |
|------|----------|--------------|
| 클래식 | `Math.floor(100000 / elapsedTime)` | O |
| 타임어택 | `correctCount` | O |

---

## 5. 공유 리워드 강화

- `contactsViral` primary, `share` fallback (현재 구조 유지)
- 보상: 하트 +2 (광고 +1보다 가치 높게)
- 공유 시점: 결과 페이지 CTA, 하트 부족 모달, 신기록 달성 시 유도

---

## 6. 세그먼트 & 푸시 알림

코드 변경 없음. 구현 완료 후 앱인토스 콘솔에서 설정.

| 세그먼트 | 조건 | 푸시 |
|----------|------|------|
| 이탈 유저 | 3일 미접속 | "하트가 가득 찼어요!" |
| 활성 유저 | 일일 챌린지 미완료 | "오늘의 챌린지!" |
| 신규 유저 | 가입 후 1일 | "어제 기록 도전!" |

---

## 파일 변경 영향도

### 수정 파일

| 파일 | 변경 |
|------|------|
| `useRewardedAd.ts` | v2 API 마이그레이션 (loadFullScreenAd/showFullScreenAd) |
| `heartService.ts` | MAX 3, 30분 충전, +1/+2 분리, 일일보너스, 쿨다운 |
| `useHeartSystem.ts` | 광고 +1, 공유 +2, 일일보너스, 업적 보상 연동 |
| `ResultPage.tsx` | 전면 광고 삽입, 리더보드 점수 제출, 업적 체크 |
| `TimeAttackResultPage.tsx` | 동일 |
| `TimeAttackPage.tsx` | +10초 보상형 광고 v2 수정 |
| `DifficultySelectPage.tsx` | 배너 광고, 일일 첫접속 보너스, 기간별 랭킹 탭 |
| `RankingPage.tsx` | 기간별 탭(일/주/월) + 게임센터 전체 랭킹 버튼 |
| `NoHeartsModal` | +1/+2 보상 표시 분리 |

### 신규 파일

| 파일 | 역할 |
|------|------|
| `useFullScreenAd.ts` | v2 전면+보상형 통합 광고 훅 |
| `useInterstitialAd.ts` | 전면 광고 빈도 제어 훅 |
| `useBannerAd.ts` | 배너 광고 초기화 훅 |
| `useGameCenterLeaderboard.ts` | 점수 제출 + 리더보드 열기 |
| `achievementService.ts` | 업적 정의, 달성 체크, 보상 지급 |
| `achievementDefinitions.ts` | 업적 목록 상수 |
| `periodRankingService.ts` | 일간/주간/월간 랭킹 쿼리 |
| `adFrequencyService.ts` | 광고 빈도/쿨다운 관리 |
| `AchievementModal.tsx` | 업적 달성 UI + 2배 보상 CTA |
| `BannerAdContainer.tsx` | 배너 광고 컨테이너 컴포넌트 |
| `PeriodRankingTabs.tsx` | 기간별 랭킹 탭 UI |
