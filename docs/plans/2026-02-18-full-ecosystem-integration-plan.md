# 풀 앱인토스 생태계 통합 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 광고 v2 마이그레이션 + 하트 리밸런싱 + 기간별 랭킹/업적 + 게임센터 SDK 도입

**Architecture:** 기존 Clean Architecture 유지. 도메인 서비스(heartService, achievementService)에서 비즈니스 로직 처리, 프레젠테이션 훅(useFullScreenAd, useHeartSystem)에서 UI 연동. Supabase RPC로 기간별 랭킹 서버 쿼리.

**Tech Stack:** React 18, TypeScript, Vitest/RTL, @apps-in-toss/web-framework v2 API, Supabase PostgreSQL

---

## Phase 1: 광고 v2 API 마이그레이션 (핵심 버그 수정)

> 가장 중요. 보상형 광고 `userEarnedReward` 콜백이 v1 API에서 미동작하는 핵심 버그 해결.

### Task 1: useFullScreenAd 훅 작성 (v2 API)

**Files:**
- Create: `src/presentation/hooks/useFullScreenAd.ts`
- Test: `src/__tests__/hooks/useFullScreenAd.test.ts`

**Step 1: 테스트 mock 업데이트 준비**

`src/test/setup.ts`에 v2 API mock 추가:

```typescript
// 기존 GoogleAdMob mock 유지 (하위 호환)
// v2 API mock 추가
vi.mock('@apps-in-toss/web-framework', () => ({
  GoogleAdMob: {
    loadAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
    showAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
  },
  loadFullScreenAd: Object.assign(vi.fn(() => vi.fn()), {
    isSupported: vi.fn(() => false),
  }),
  showFullScreenAd: Object.assign(vi.fn(() => vi.fn()), {
    isSupported: vi.fn(() => false),
  }),
  share: vi.fn(() => Promise.resolve()),
  contactsViral: vi.fn(() => vi.fn()),
  getOperationalEnvironment: vi.fn(() => 'sandbox'),
}));
```

**Step 2: 실패하는 테스트 작성**

```typescript
// src/__tests__/hooks/useFullScreenAd.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useFullScreenAd', () => {
  it('isAdSupported가 false를 반환한다 (jsdom 환경)', () => {
    const { useFullScreenAd } = await import('@presentation/hooks/useFullScreenAd');
    const { result } = renderHook(() => useFullScreenAd());
    expect(result.current.isAdSupported).toBe(false);
  });

  it('지원되지 않는 환경에서 loadAndShowAd 호출 시 onError 콜백', () => {
    const { useFullScreenAd } = await import('@presentation/hooks/useFullScreenAd');
    const { result } = renderHook(() => useFullScreenAd());
    const onError = vi.fn();
    act(() => {
      result.current.loadAndShowAd({ onRewarded: vi.fn(), onError });
    });
    expect(onError).toHaveBeenCalled();
  });
});
```

Run: `npm test -- --run src/__tests__/hooks/useFullScreenAd.test.ts`
Expected: FAIL (module not found)

**Step 3: useFullScreenAd 훅 구현**

```typescript
// src/presentation/hooks/useFullScreenAd.ts
/**
 * v2 전면/보상형 광고 통합 훅
 * loadFullScreenAd + showFullScreenAd (apps-in-toss v2 API)
 */

import { useCallback, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

const AD_GROUP_ID = 'ait.v2.live.c3e1be11131c45f6';

interface FullScreenAdCallbacks {
  onRewarded: () => void;
  onDismiss?: () => void;
  onError?: (error: Error) => void;
}

interface UseFullScreenAdReturn {
  isAdSupported: boolean;
  isAdLoading: boolean;
  loadAndShowAd: (callbacks: FullScreenAdCallbacks) => void;
}

export function useFullScreenAd(): UseFullScreenAdReturn {
  const [isAdSupported] = useState(() => {
    return loadFullScreenAd.isSupported?.() === true;
  });
  const [isAdLoading, setIsAdLoading] = useState(false);

  const rewardCallbackRef = useRef<(() => void) | undefined>();
  const dismissCallbackRef = useRef<(() => void) | undefined>();
  const errorCallbackRef = useRef<((error: Error) => void) | undefined>();

  const loadAndShowAd = useCallback(({ onRewarded, onDismiss, onError }: FullScreenAdCallbacks) => {
    if (!isAdSupported) {
      onError?.(new Error('광고가 지원되지 않는 환경입니다.'));
      return;
    }

    if (isAdLoading) return;

    rewardCallbackRef.current = onRewarded;
    dismissCallbackRef.current = onDismiss;
    errorCallbackRef.current = onError;
    setIsAdLoading(true);

    try {
      const cleanup = loadFullScreenAd({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            cleanup();
            try {
              showFullScreenAd({
                options: { adGroupId: AD_GROUP_ID },
                onEvent: (showEvent) => {
                  switch (showEvent.type) {
                    case 'userEarnedReward':
                      rewardCallbackRef.current?.();
                      break;
                    case 'dismissed':
                      setIsAdLoading(false);
                      dismissCallbackRef.current?.();
                      break;
                    case 'failedToShow':
                      setIsAdLoading(false);
                      errorCallbackRef.current?.(new Error('광고 표시에 실패했습니다.'));
                      break;
                  }
                },
                onError: (err) => {
                  setIsAdLoading(false);
                  errorCallbackRef.current?.(err instanceof Error ? err : new Error(String(err)));
                },
              });
            } catch (showErr) {
              setIsAdLoading(false);
              errorCallbackRef.current?.(showErr instanceof Error ? showErr : new Error('광고 표시 실패'));
            }
          }
        },
        onError: (loadErr) => {
          setIsAdLoading(false);
          errorCallbackRef.current?.(loadErr instanceof Error ? loadErr : new Error(String(loadErr)));
        },
      });
    } catch (error) {
      setIsAdLoading(false);
      onError?.(error instanceof Error ? error : new Error('광고 로드 실패'));
    }
  }, [isAdSupported, isAdLoading]);

  return { isAdSupported, isAdLoading, loadAndShowAd };
}
```

**Step 4: 테스트 통과 확인**

Run: `npm test -- --run src/__tests__/hooks/useFullScreenAd.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/presentation/hooks/useFullScreenAd.ts src/__tests__/hooks/useFullScreenAd.test.ts src/test/setup.ts
git commit -m "feat(ad): v2 API useFullScreenAd 훅 추가 (loadFullScreenAd/showFullScreenAd)"
```

---

### Task 2: useRewardedAd → useFullScreenAd 전환

**Files:**
- Modify: `src/presentation/hooks/useRewardedAd.ts` — deprecated 마킹
- Modify: `src/presentation/hooks/useHeartSystem.ts:16,40` — import 변경
- Modify: `src/presentation/pages/TimeAttackPage.tsx:9,28` — import 변경

**Step 1: useRewardedAd.ts에 deprecated 주석 추가 & re-export**

```typescript
// src/presentation/hooks/useRewardedAd.ts
/**
 * @deprecated v2 API로 마이그레이션됨. useFullScreenAd 사용.
 * 하위 호환을 위해 re-export만 유지.
 */
export { useFullScreenAd as useRewardedAd } from './useFullScreenAd';
```

**Step 2: 기존 테스트 실행하여 호환성 확인**

Run: `npm test -- --run`
Expected: 기존 테스트 전부 PASS (re-export로 인터페이스 동일)

**Step 3: 커밋**

```bash
git add src/presentation/hooks/useRewardedAd.ts
git commit -m "refactor(ad): useRewardedAd를 useFullScreenAd의 re-export로 전환"
```

---

### Task 3: 광고 빈도 제어 서비스

**Files:**
- Create: `src/domain/services/adFrequencyService.ts`
- Test: `src/__tests__/services/adFrequencyService.test.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
// src/__tests__/services/adFrequencyService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldShowInterstitial,
  recordInterstitialShown,
  incrementGameCount,
  canShowRewardedAd,
  recordRewardedAdShown,
} from '@domain/services/adFrequencyService';

describe('adFrequencyService', () => {
  beforeEach(() => { localStorage.clear(); });

  describe('전면 광고 빈도', () => {
    it('첫 게임에서는 전면 광고를 보여주지 않는다', () => {
      expect(shouldShowInterstitial()).toBe(false);
    });

    it('3판 후 전면 광고를 보여준다', () => {
      incrementGameCount();
      incrementGameCount();
      incrementGameCount();
      expect(shouldShowInterstitial()).toBe(true);
    });

    it('전면 광고 표시 후 카운트가 리셋된다', () => {
      incrementGameCount();
      incrementGameCount();
      incrementGameCount();
      recordInterstitialShown();
      expect(shouldShowInterstitial()).toBe(false);
    });

    it('하루 최대 10회 cap', () => {
      for (let i = 0; i < 30; i++) { incrementGameCount(); }
      for (let i = 0; i < 10; i++) { recordInterstitialShown(); }
      incrementGameCount();
      incrementGameCount();
      incrementGameCount();
      expect(shouldShowInterstitial()).toBe(false);
    });
  });

  describe('보상형 광고 쿨다운', () => {
    it('첫 보상형 광고는 허용된다', () => {
      expect(canShowRewardedAd()).toBe(true);
    });

    it('60초 이내 재시청 차단', () => {
      recordRewardedAdShown();
      expect(canShowRewardedAd()).toBe(false);
    });

    it('하루 최대 15회 cap', () => {
      for (let i = 0; i < 15; i++) {
        recordRewardedAdShown();
      }
      // 시간이 지나도 일일 cap 초과
      expect(canShowRewardedAd()).toBe(false);
    });
  });
});
```

Run: `npm test -- --run src/__tests__/services/adFrequencyService.test.ts`
Expected: FAIL

**Step 2: 구현**

```typescript
// src/domain/services/adFrequencyService.ts
const INTERSTITIAL_KEY = 'ad-interstitial-freq';
const REWARDED_KEY = 'ad-rewarded-freq';
const GAMES_PER_INTERSTITIAL = 3;
const MAX_INTERSTITIAL_PER_DAY = 10;
const REWARDED_COOLDOWN_MS = 60 * 1000; // 60초
const MAX_REWARDED_PER_DAY = 15;

interface InterstitialData {
  gameCount: number;
  dailyShownCount: number;
  lastResetDate: string; // YYYY-MM-DD
}

interface RewardedData {
  lastShownAt: number; // timestamp
  dailyCount: number;
  lastResetDate: string;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadInterstitialData(): InterstitialData {
  try {
    const stored = localStorage.getItem(INTERSTITIAL_KEY);
    if (stored) {
      const data: InterstitialData = JSON.parse(stored);
      if (data.lastResetDate !== getTodayStr()) {
        return { gameCount: 0, dailyShownCount: 0, lastResetDate: getTodayStr() };
      }
      return data;
    }
  } catch { /* fallback */ }
  return { gameCount: 0, dailyShownCount: 0, lastResetDate: getTodayStr() };
}

function saveInterstitialData(data: InterstitialData): void {
  localStorage.setItem(INTERSTITIAL_KEY, JSON.stringify(data));
}

export function incrementGameCount(): void {
  const data = loadInterstitialData();
  data.gameCount += 1;
  saveInterstitialData(data);
}

export function shouldShowInterstitial(): boolean {
  const data = loadInterstitialData();
  return data.gameCount >= GAMES_PER_INTERSTITIAL && data.dailyShownCount < MAX_INTERSTITIAL_PER_DAY;
}

export function recordInterstitialShown(): void {
  const data = loadInterstitialData();
  data.gameCount = 0;
  data.dailyShownCount += 1;
  saveInterstitialData(data);
}

function loadRewardedData(): RewardedData {
  try {
    const stored = localStorage.getItem(REWARDED_KEY);
    if (stored) {
      const data: RewardedData = JSON.parse(stored);
      if (data.lastResetDate !== getTodayStr()) {
        return { lastShownAt: 0, dailyCount: 0, lastResetDate: getTodayStr() };
      }
      return data;
    }
  } catch { /* fallback */ }
  return { lastShownAt: 0, dailyCount: 0, lastResetDate: getTodayStr() };
}

function saveRewardedData(data: RewardedData): void {
  localStorage.setItem(REWARDED_KEY, JSON.stringify(data));
}

export function canShowRewardedAd(): boolean {
  const data = loadRewardedData();
  const now = Date.now();
  const cooldownOk = now - data.lastShownAt >= REWARDED_COOLDOWN_MS;
  return cooldownOk && data.dailyCount < MAX_REWARDED_PER_DAY;
}

export function recordRewardedAdShown(): void {
  const data = loadRewardedData();
  data.lastShownAt = Date.now();
  data.dailyCount += 1;
  saveRewardedData(data);
}
```

**Step 3: 테스트 통과 확인**

Run: `npm test -- --run src/__tests__/services/adFrequencyService.test.ts`
Expected: PASS

**Step 4: 커밋**

```bash
git add src/domain/services/adFrequencyService.ts src/__tests__/services/adFrequencyService.test.ts
git commit -m "feat(ad): 전면/보상형 광고 빈도 제어 서비스 추가"
```

---

## Phase 2: 하트 경제 리밸런싱

### Task 4: heartService 상수 변경 + addHearts 함수 추가

**Files:**
- Modify: `src/domain/services/heartService.ts`
- Test: `src/__tests__/services/heartService.test.ts` (기존 파일 수정)

**Step 1: 실패하는 테스트 작성**

```typescript
// 기존 heartService.test.ts에 추가
describe('heartService 리밸런싱', () => {
  beforeEach(() => { localStorage.clear(); });

  it('MAX_HEARTS는 3이다', () => {
    expect(MAX_HEARTS).toBe(3);
  });

  it('RECHARGE_INTERVAL_MS는 30분이다', () => {
    expect(RECHARGE_INTERVAL_MS).toBe(30 * 60 * 1000);
  });

  it('addHearts(1)은 하트를 1개 추가한다', () => {
    // 하트 0개 상태에서 시작
    consumeHeart(); consumeHeart(); consumeHeart();
    const before = getHeartCount();
    addHearts(1);
    expect(getHeartCount()).toBe(before + 1);
  });

  it('addHearts는 MAX_HEARTS를 초과하지 않는다', () => {
    addHearts(10);
    expect(getHeartCount()).toBe(3);
  });

  it('getDailyLoginBonus는 하루에 한 번만 풀충전한다', () => {
    consumeHeart(); consumeHeart(); // 1개 남음
    const first = claimDailyLoginBonus();
    expect(first).toBe(true);
    expect(getHeartCount()).toBe(3);
    const second = claimDailyLoginBonus();
    expect(second).toBe(false);
  });
});
```

Run: `npm test -- --run src/__tests__/services/heartService.test.ts`
Expected: FAIL (addHearts, claimDailyLoginBonus not found, MAX_HEARTS=5)

**Step 2: heartService 수정**

`src/domain/services/heartService.ts` 변경:

```typescript
const MAX_HEARTS = 3;                         // 5 → 3
const RECHARGE_INTERVAL_MS = 30 * 60 * 1000;  // 1시간 → 30분

// 기존 refillHearts 유지 (풀충전용)

// 신규: 하트 N개 추가 (MAX 초과 불가)
export function addHearts(count: number): void {
  const data = loadHeartData();
  const updated = calculateRechargedHearts(data);
  const newCount = Math.min(MAX_HEARTS, updated.count + count);
  saveHeartData({
    count: newCount,
    lastRechargeTime: updated.lastRechargeTime,
  });
}

// 신규: 일일 첫접속 보너스 (하루 1회 풀충전)
const DAILY_BONUS_KEY = 'math-time-attack-daily-bonus';

export function claimDailyLoginBonus(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const lastClaimed = localStorage.getItem(DAILY_BONUS_KEY);
  if (lastClaimed === today) return false;

  localStorage.setItem(DAILY_BONUS_KEY, today);
  refillHearts();
  return true;
}
```

**Step 3: 기존 테스트 수정 (MAX_HEARTS 5→3 반영)**

기존 테스트에서 `MAX_HEARTS`를 참조하는 부분 업데이트. `getHeartInfo().maxHearts`가 3인지 확인.

**Step 4: 전체 테스트 통과 확인**

Run: `npm test -- --run`
Expected: PASS (일부 기존 테스트에서 MAX_HEARTS=5 하드코딩 시 수정 필요)

**Step 5: 커밋**

```bash
git add src/domain/services/heartService.ts src/__tests__/services/heartService.test.ts
git commit -m "feat(heart): 하트 경제 리밸런싱 - MAX 3, 30분 충전, addHearts 추가"
```

---

### Task 5: useHeartSystem 훅 업데이트 (광고 +1, 공유 +2)

**Files:**
- Modify: `src/presentation/hooks/useHeartSystem.ts`
- Modify: `src/presentation/components/NoHeartsModal.tsx`

**Step 1: useHeartSystem에서 refillHearts → addHearts 변경**

```typescript
// useHeartSystem.ts 변경 포인트:

// import 추가
import { addHearts } from '@domain/services/heartService';
import { canShowRewardedAd, recordRewardedAdShown } from '@domain/services/adFrequencyService';

// handleWatchAdForHearts 내부:
// 변경 전: refillHearts();
// 변경 후: addHearts(1); recordRewardedAdShown();

// handleShareForHearts 내부:
// 변경 전: refillHearts();
// 변경 후: addHearts(2);
```

**Step 2: NoHeartsModal 텍스트 변경**

```tsx
// 변경 전: "광고 보고 풀충전"
// 변경 후: "광고 보고 +1"

// 변경 전: "공유하고 풀충전"
// 변경 후: "친구 초대하고 +2"
```

**Step 3: 기존 테스트 통과 확인**

Run: `npm test -- --run`
Expected: 기존 테스트 assertion에 "풀충전" 텍스트가 있으면 업데이트 필요

**Step 4: 커밋**

```bash
git add src/presentation/hooks/useHeartSystem.ts src/presentation/components/NoHeartsModal.tsx
git commit -m "feat(heart): 광고 +1, 공유 +2 보상 분리 적용"
```

---

## Phase 3: 전면 광고 & 배너 광고 연동

### Task 6: useInterstitialAd 훅 (결과 페이지 전면 광고)

**Files:**
- Create: `src/presentation/hooks/useInterstitialAd.ts`
- Test: `src/__tests__/hooks/useInterstitialAd.test.ts`

**Step 1: 테스트 작성**

```typescript
describe('useInterstitialAd', () => {
  it('shouldShow가 adFrequencyService 기반으로 동작한다', () => {
    // incrementGameCount 3번 → shouldShow true
  });

  it('show 호출 시 loadFullScreenAd → showFullScreenAd 체인', () => {
    // mock 환경에서는 isSupported false → 바로 onComplete
  });
});
```

**Step 2: 구현**

```typescript
// src/presentation/hooks/useInterstitialAd.ts
import { useCallback, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { shouldShowInterstitial, recordInterstitialShown, incrementGameCount } from '@domain/services/adFrequencyService';

const AD_GROUP_ID = 'ait.v2.live.c3e1be11131c45f6';

export function useInterstitialAd() {
  const [isShowing, setIsShowing] = useState(false);

  const isSupported = loadFullScreenAd.isSupported?.() === true;

  const tryShowInterstitial = useCallback((onComplete: () => void) => {
    incrementGameCount();

    if (!isSupported || !shouldShowInterstitial()) {
      onComplete();
      return;
    }

    setIsShowing(true);
    try {
      const cleanup = loadFullScreenAd({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            cleanup();
            recordInterstitialShown();
            showFullScreenAd({
              options: { adGroupId: AD_GROUP_ID },
              onEvent: (showEvent) => {
                if (showEvent.type === 'dismissed' || showEvent.type === 'failedToShow') {
                  setIsShowing(false);
                  onComplete();
                }
              },
              onError: () => { setIsShowing(false); onComplete(); },
            });
          }
        },
        onError: () => { setIsShowing(false); onComplete(); },
      });
    } catch {
      setIsShowing(false);
      onComplete();
    }
  }, [isSupported]);

  return { isShowing, tryShowInterstitial };
}
```

**Step 3: 테스트 통과 & 커밋**

```bash
git add src/presentation/hooks/useInterstitialAd.ts src/__tests__/hooks/useInterstitialAd.test.ts
git commit -m "feat(ad): 전면 광고 훅 useInterstitialAd 추가 (3판마다 자동)"
```

---

### Task 7: AdBanner 컴포넌트 앱인토스 SDK 전환

**Files:**
- Modify: `src/presentation/components/AdBanner.tsx` — AdSense → 앱인토스 TossAds 배너

**Step 1: AdBanner 전면 재작성**

> 현재 AdBanner는 Google AdSense 기반. 앱인토스 환경에서는 동작하지 않음.
> `TossAds.initialize` + 배너 API가 있으나, 앱인토스 docs에서 배너 API 상세가 제한적.
> 우선 전면/보상형에 집중하고, 배너는 placeholder로 남겨두거나 v2 배너 API 확인 후 구현.

```typescript
// src/presentation/components/AdBanner.tsx
/**
 * 배너 광고 컨테이너
 * TODO: 앱인토스 배너 SDK 확인 후 구현
 * 현재는 환경 체크 후 AdSense fallback
 */
interface AdBannerProps {
  className?: string;
  position?: 'top' | 'bottom';
}

export function AdBanner({ className = '', position = 'bottom' }: AdBannerProps) {
  // 앱인토스 환경에서는 배너 미표시 (전면/보상형만 지원 확인)
  // 웹 환경에서는 기존 AdSense 유지
  return null; // Phase 1에서는 비활성화, 배너 API 확인 후 활성화
}
```

**Step 2: 커밋**

```bash
git add src/presentation/components/AdBanner.tsx
git commit -m "refactor(ad): AdBanner 앱인토스 환경 대응 (배너 API 확인 후 활성화 예정)"
```

---

### Task 8: AdInterstitial 컴포넌트 제거 & useInterstitialAd로 대체

**Files:**
- Modify: `src/presentation/components/AdInterstitial.tsx` — deprecated
- Modify: `src/presentation/components/index.ts` — export 정리

**Step 1: AdInterstitial을 단순 re-export / noop으로 변경**

```typescript
// src/presentation/components/AdInterstitial.tsx
/**
 * @deprecated useInterstitialAd 훅으로 대체됨.
 * 하위 호환을 위해 incrementGameCount만 re-export.
 */
export { incrementGameCount } from '@domain/services/adFrequencyService';
```

**Step 2: 커밋**

```bash
git add src/presentation/components/AdInterstitial.tsx src/presentation/components/index.ts
git commit -m "refactor(ad): AdInterstitial 컴포넌트 → useInterstitialAd 훅으로 대체"
```

---

## Phase 4: 결과 페이지 광고 통합

### Task 9: ResultPage에 전면 광고 + 보상형 CTA 연동

**Files:**
- Modify: `src/presentation/pages/ResultPage.tsx`

**Step 1: 전면 광고 훅 연동**

```typescript
// ResultPage.tsx에 추가:
import { useInterstitialAd } from '@presentation/hooks/useInterstitialAd';
import { useFullScreenAd } from '@presentation/hooks/useFullScreenAd';

// 컴포넌트 내부:
const { tryShowInterstitial } = useInterstitialAd();
const { isAdSupported: isRewardedAdSupported, loadAndShowAd } = useFullScreenAd();

// useEffect 내 processResult 완료 후:
// 전면 광고 시도 (3판마다)
tryShowInterstitial(() => {
  // 광고 끝나면 결과 표시 (이미 표시 중이므로 noop)
});
```

**Step 2: "광고 보고 하트 +1" CTA 버튼 추가**

결과 카드 하단에:
```tsx
{isRewardedAdSupported && !heartInfo.isFull && (
  <button className="action-btn reward-ad" onClick={() => {
    loadAndShowAd({
      onRewarded: () => { addHearts(1); refreshHeartInfo(); },
      onDismiss: () => {},
      onError: () => {},
    });
  }}>
    📺 광고 보고 하트 +1
  </button>
)}
```

**Step 3: 테스트 통과 확인**

Run: `npm test -- --run`
Expected: PASS

**Step 4: 커밋**

```bash
git add src/presentation/pages/ResultPage.tsx
git commit -m "feat(ad): ResultPage에 전면 광고 + 보상형 하트 CTA 연동"
```

---

### Task 10: TimeAttackResultPage 동일 적용

**Files:**
- Modify: `src/presentation/pages/TimeAttackResultPage.tsx`

ResultPage와 동일한 패턴 적용:
- `useInterstitialAd` 전면 광고
- "광고 보고 하트 +1" CTA

```bash
git commit -m "feat(ad): TimeAttackResultPage에 전면 광고 + 보상형 하트 CTA 연동"
```

---

## Phase 5: 기간별 랭킹 확장

### Task 11: recordService에 기간별 랭킹 쿼리 추가

**Files:**
- Modify: `src/data/recordService.ts`
- Test: `src/__tests__/services/recordService.test.ts`

**Step 1: 기간 헬퍼 함수 추가**

기존 `getWeekStart()` 옆에:

```typescript
export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

function getDayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getPeriodStartDate(period: RankingPeriod): string | undefined {
  switch (period) {
    case 'daily': return getDayStart().toISOString();
    case 'weekly': return getWeekStart().toISOString();
    case 'monthly': return getMonthStart().toISOString();
    case 'all': return undefined;
  }
}
```

**Step 2: getTopRankings의 period 타입 확장**

```typescript
// 기존: period: 'all' | 'weekly'
// 변경: period: RankingPeriod = 'all'
export async function getTopRankings(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION,
  limit: number = 100,
  period: RankingPeriod = 'all'
): Promise<RankingItem[]> {
  // ...
  const sinceDate = getPeriodStartDate(period);
  if (sinceDate) {
    params.p_since = sinceDate;
  }
  // ...
}
```

동일하게 `getTimeAttackRankings`도 업데이트.

**Step 3: 테스트 통과 & 커밋**

```bash
git commit -m "feat(ranking): 기간별 랭킹 쿼리 확장 (daily/weekly/monthly/all)"
```

---

### Task 12: RankingPage 기간 탭 확장

**Files:**
- Modify: `src/presentation/pages/RankingPage.tsx`

**Step 1: 기간 탭 4개로 확장**

```typescript
// 변경 전:
type RankingPeriod = 'all' | 'weekly';

// 변경 후:
import type { RankingPeriod } from '@data/recordService';
// 탭: 오늘 | 이번 주 | 이번 달 | 전체
```

**Step 2: 게임센터 리더보드 버튼 추가 (전체 탭)**

```tsx
{period === 'all' && (
  <button className="game-center-btn" onClick={handleOpenGameCenter}>
    🏆 공식 리더보드 보기
  </button>
)}
```

**Step 3: 커밋**

```bash
git commit -m "feat(ranking): RankingPage 기간별 탭 4개 (일간/주간/월간/전체) + 게임센터 버튼"
```

---

## Phase 6: 게임센터 리더보드 SDK

### Task 13: useGameCenterLeaderboard 훅

**Files:**
- Create: `src/presentation/hooks/useGameCenterLeaderboard.ts`
- Test: `src/__tests__/hooks/useGameCenterLeaderboard.test.ts`

**Step 1: 테스트 작성**

```typescript
describe('useGameCenterLeaderboard', () => {
  it('jsdom 환경에서 isSupported가 false', () => {
    const { result } = renderHook(() => useGameCenterLeaderboard());
    expect(result.current.isSupported).toBe(false);
  });

  it('미지원 환경에서 submitScore는 조용히 실패', async () => {
    const { result } = renderHook(() => useGameCenterLeaderboard());
    // 에러 없이 완료
    await expect(result.current.submitScore(1000)).resolves.toBeUndefined();
  });
});
```

**Step 2: 구현**

```typescript
// src/presentation/hooks/useGameCenterLeaderboard.ts
import { useState } from 'react';

// 앱인토스 게임센터 SDK import
// submitGameCenterLeaderBoardScore, openGameCenterLeaderboard
// @apps-in-toss/web-framework에서 import

export function useGameCenterLeaderboard() {
  const [isSupported] = useState(() => {
    try {
      // submitGameCenterLeaderBoardScore.isSupported?.() === true
      return false; // 실제 SDK 확인 후 업데이트
    } catch {
      return false;
    }
  });

  const submitScore = async (score: number): Promise<void> => {
    if (!isSupported) return;
    try {
      // await submitGameCenterLeaderBoardScore({ score });
    } catch (err) {
      console.error('Failed to submit score to game center:', err);
    }
  };

  const openLeaderboard = (): void => {
    if (!isSupported) return;
    try {
      // openGameCenterLeaderboard();
    } catch (err) {
      console.error('Failed to open game center leaderboard:', err);
    }
  };

  return { isSupported, submitScore, openLeaderboard };
}
```

> **Note:** 게임센터 SDK의 정확한 import path와 함수 시그니처는 앱인토스 문서에서 확인 필요.
> `submitGameCenterLeaderBoardScore`, `openGameCenterLeaderboard`가 `@apps-in-toss/web-framework`에 포함되는지 별도 패키지인지 확인.

**Step 3: 커밋**

```bash
git commit -m "feat(gamecenter): useGameCenterLeaderboard 훅 추가 (점수 제출 + 리더보드 열기)"
```

---

### Task 14: ResultPage / TimeAttackResultPage에 점수 제출 연동

**Files:**
- Modify: `src/presentation/pages/ResultPage.tsx`
- Modify: `src/presentation/pages/TimeAttackResultPage.tsx`

**Step 1: 점수 계산 로직 추가**

```typescript
// ResultPage (클래식):
const gameCenterScore = Math.floor(100000 / elapsedTime);
await submitScore(gameCenterScore);

// TimeAttackResultPage:
await submitScore(correctCount);
```

**Step 2: 커밋**

```bash
git commit -m "feat(gamecenter): 결과 페이지에서 게임센터 점수 제출 연동"
```

---

## Phase 7: 업적 시스템

### Task 15: achievementService 도메인 서비스

**Files:**
- Create: `src/domain/services/achievementService.ts`
- Create: `src/domain/services/achievementDefinitions.ts`
- Test: `src/__tests__/services/achievementService.test.ts`

**Step 1: 업적 정의 상수**

```typescript
// src/domain/services/achievementDefinitions.ts
export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  emoji: string;
  heartReward: number; // 0 = 보상 없음 (칭호만)
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { key: 'first_clear', title: '첫 도전', description: '첫 게임 클리어', emoji: '🎯', heartReward: 1 },
  { key: 'speed_king', title: '속도왕', description: '쉬움 10초 이내 클리어', emoji: '⚡', heartReward: 1 },
  { key: 'perfect_streak', title: '퍼펙트 스트릭', description: '타임어택 20연속 정답', emoji: '🔥', heartReward: 2 },
  { key: 'streak_7', title: '꾸준함', description: '7일 연속 출석', emoji: '📅', heartReward: 3 },
  { key: 'all_clear', title: '올클리어', description: '모든 난이도 완료', emoji: '👑', heartReward: 3 },
  { key: 'master', title: '구구단 마스터', description: '어려움 15초 이내 클리어', emoji: '🏆', heartReward: 0 },
  { key: 'social_5', title: '사교왕', description: '친구 5명 초대', emoji: '🤝', heartReward: 3 },
];
```

**Step 2: 테스트 작성**

```typescript
describe('achievementService', () => {
  beforeEach(() => { localStorage.clear(); });

  it('미달성 업적을 체크하면 null 반환', () => {
    const result = checkAchievement('first_clear', { gamesPlayed: 0 });
    expect(result).toBeNull();
  });

  it('첫 게임 클리어 업적 달성', () => {
    const result = checkAchievement('first_clear', { gamesPlayed: 1 });
    expect(result).not.toBeNull();
    expect(result?.key).toBe('first_clear');
  });

  it('이미 달성한 업적은 중복 달성하지 않는다', () => {
    markAchieved('first_clear');
    const result = checkAchievement('first_clear', { gamesPlayed: 1 });
    expect(result).toBeNull();
  });
});
```

**Step 3: 구현**

```typescript
// src/domain/services/achievementService.ts
import { ACHIEVEMENTS, type AchievementDefinition } from './achievementDefinitions';

const ACHIEVED_KEY = 'math-attack-achievements';

interface AchievementContext {
  gamesPlayed?: number;
  elapsedTime?: number;
  difficulty?: string;
  correctStreak?: number;
  streakDays?: number;
  shareCount?: number;
  clearedDifficulties?: string[];
}

function getAchievedKeys(): Set<string> {
  try {
    const stored = localStorage.getItem(ACHIEVED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function markAchieved(key: string): void {
  const achieved = getAchievedKeys();
  achieved.add(key);
  localStorage.setItem(ACHIEVED_KEY, JSON.stringify([...achieved]));
}

export function isAchieved(key: string): boolean {
  return getAchievedKeys().has(key);
}

export function checkAchievement(key: string, context: AchievementContext): AchievementDefinition | null {
  if (isAchieved(key)) return null;

  const def = ACHIEVEMENTS.find(a => a.key === key);
  if (!def) return null;

  let met = false;
  switch (key) {
    case 'first_clear':
      met = (context.gamesPlayed ?? 0) >= 1;
      break;
    case 'speed_king':
      met = context.difficulty === 'easy' && (context.elapsedTime ?? Infinity) <= 10000;
      break;
    case 'perfect_streak':
      met = (context.correctStreak ?? 0) >= 20;
      break;
    case 'streak_7':
      met = (context.streakDays ?? 0) >= 7;
      break;
    case 'all_clear':
      met = (context.clearedDifficulties?.length ?? 0) >= 3;
      break;
    case 'master':
      met = context.difficulty === 'hard' && (context.elapsedTime ?? Infinity) <= 15000;
      break;
    case 'social_5':
      met = (context.shareCount ?? 0) >= 5;
      break;
  }

  return met ? def : null;
}

export function checkAllAchievements(context: AchievementContext): AchievementDefinition[] {
  return ACHIEVEMENTS
    .map(a => checkAchievement(a.key, context))
    .filter((a): a is AchievementDefinition => a !== null);
}

export function getAchievedList(): AchievementDefinition[] {
  const achieved = getAchievedKeys();
  return ACHIEVEMENTS.filter(a => achieved.has(a.key));
}
```

**Step 4: 테스트 통과 & 커밋**

```bash
git commit -m "feat(achievement): 업적 시스템 서비스 + 7개 업적 정의"
```

---

### Task 16: AchievementModal 컴포넌트

**Files:**
- Create: `src/presentation/components/AchievementModal.tsx`
- Modify: `src/presentation/components/index.ts` — export 추가

**Step 1: 구현**

```tsx
// src/presentation/components/AchievementModal.tsx
import type { AchievementDefinition } from '@domain/services/achievementDefinitions';

interface AchievementModalProps {
  achievement: AchievementDefinition;
  isAdSupported: boolean;
  isAdLoading: boolean;
  onClaim: () => void;           // 기본 보상 받기
  onClaimWithAd: () => void;     // 광고 보고 2배 보상
  onClose: () => void;
}

export function AchievementModal({
  achievement,
  isAdSupported,
  isAdLoading,
  onClaim,
  onClaimWithAd,
  onClose,
}: AchievementModalProps) {
  return (
    <div className="achievement-modal-overlay">
      <div className="achievement-modal">
        <div className="achievement-emoji">{achievement.emoji}</div>
        <h2 className="achievement-title">업적 달성!</h2>
        <p className="achievement-name">{achievement.title}</p>
        <p className="achievement-desc">{achievement.description}</p>

        {achievement.heartReward > 0 && (
          <div className="achievement-reward">
            보상: 하트 +{achievement.heartReward}
          </div>
        )}

        <div className="achievement-actions">
          <button className="achievement-btn primary" onClick={onClaim}>
            보상 받기
          </button>
          {isAdSupported && achievement.heartReward > 0 && (
            <button
              className="achievement-btn bonus"
              onClick={onClaimWithAd}
              disabled={isAdLoading}
            >
              {isAdLoading ? '광고 준비 중...' : `광고 보고 +${achievement.heartReward * 2} 받기`}
            </button>
          )}
          <button className="achievement-btn secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: index.ts에 export 추가**

```typescript
export { AchievementModal } from './AchievementModal';
```

**Step 3: 커밋**

```bash
git commit -m "feat(achievement): AchievementModal 컴포넌트 추가"
```

---

## Phase 8: 일일 첫접속 보너스 & 연동

### Task 17: DifficultySelectPage에 일일 보너스 연동

**Files:**
- Modify: `src/presentation/pages/DifficultySelectPage.tsx`

**Step 1: 일일 보너스 체크 추가**

```typescript
import { claimDailyLoginBonus } from '@domain/services/heartService';

// 컴포넌트 마운트 시:
useEffect(() => {
  const claimed = claimDailyLoginBonus();
  if (claimed) {
    // 토스트로 "오늘 첫 접속 보너스! 하트 풀충전" 표시
    setShowDailyBonus(true);
    setTimeout(() => setShowDailyBonus(false), 3000);
  }
}, []);
```

**Step 2: 커밋**

```bash
git commit -m "feat(heart): DifficultySelectPage 일일 첫접속 보너스 연동"
```

---

### Task 18: test/setup.ts mock 최종 정리

**Files:**
- Modify: `src/test/setup.ts`

**Step 1: v2 API mock 포함 최종 정리**

```typescript
vi.mock('@apps-in-toss/web-framework', () => ({
  // v1 (하위 호환)
  GoogleAdMob: {
    loadAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
    showAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
  },
  // v2 API
  loadFullScreenAd: Object.assign(vi.fn(() => vi.fn()), {
    isSupported: vi.fn(() => false),
  }),
  showFullScreenAd: Object.assign(vi.fn(() => vi.fn()), {
    isSupported: vi.fn(() => false),
  }),
  // 게임센터
  submitGameCenterLeaderBoardScore: Object.assign(vi.fn(() => Promise.resolve()), {
    isSupported: vi.fn(() => false),
  }),
  openGameCenterLeaderboard: Object.assign(vi.fn(), {
    isSupported: vi.fn(() => false),
  }),
  // 공유/바이럴
  share: vi.fn(() => Promise.resolve()),
  contactsViral: vi.fn(() => vi.fn()),
  getOperationalEnvironment: vi.fn(() => 'sandbox'),
}));
```

**Step 2: 전체 테스트 통과 확인**

Run: `npm test -- --run`
Expected: ALL PASS

**Step 3: 커밋**

```bash
git add src/test/setup.ts
git commit -m "test: 전역 mock에 v2 광고/게임센터 API 추가"
```

---

## Phase 9: 최종 검증 & 문서 업데이트

### Task 19: 전체 빌드 & 타입 체크

**Step 1: 타입 체크**

Run: `npm run typecheck`
Expected: 에러 0개

**Step 2: 린트**

Run: `npm run lint`
Expected: 에러 0개

**Step 3: 빌드**

Run: `npm run build`
Expected: 성공 (gzip < 500KB)

**Step 4: 전체 테스트**

Run: `npm test -- --run`
Expected: ALL PASS

---

### Task 20: CLAUDE.md & PROGRESS.md 업데이트

**Files:**
- Modify: `CLAUDE.md` — 하트 시스템 상수 업데이트 (MAX 3, 30분), 광고 v2 정보
- Modify: `docs/PROGRESS.md` — 작업 기록

**Step 1: CLAUDE.md 하트 시스템 섹션 업데이트**

```markdown
## 하트 시스템 주의사항
- MAX_HEARTS: 3 (변경됨, 이전: 5)
- RECHARGE_INTERVAL: 30분 (변경됨, 이전: 1시간)
- 광고 보상: +1개 (변경됨, 이전: 풀충전)
- 공유 보상: +2개 (변경됨, 이전: 풀충전)
- 일일 첫접속: 풀충전 (신규)
```

**Step 2: 커밋**

```bash
git commit -m "docs: CLAUDE.md/PROGRESS.md 생태계 통합 반영"
```

---

## 작업 순서 요약

| Phase | Task | 내용 | 의존성 |
|-------|------|------|--------|
| 1 | 1 | useFullScreenAd 훅 (v2 API) | 없음 |
| 1 | 2 | useRewardedAd → re-export 전환 | Task 1 |
| 1 | 3 | adFrequencyService (빈도 제어) | 없음 |
| 2 | 4 | heartService 리밸런싱 | 없음 |
| 2 | 5 | useHeartSystem + NoHeartsModal 업데이트 | Task 4 |
| 3 | 6 | useInterstitialAd 훅 | Task 1, 3 |
| 3 | 7 | AdBanner 정리 | 없음 |
| 3 | 8 | AdInterstitial deprecated | Task 3 |
| 4 | 9 | ResultPage 광고 통합 | Task 5, 6 |
| 4 | 10 | TimeAttackResultPage 광고 통합 | Task 5, 6 |
| 5 | 11 | recordService 기간별 랭킹 | 없음 |
| 5 | 12 | RankingPage 기간 탭 확장 | Task 11 |
| 6 | 13 | useGameCenterLeaderboard 훅 | 없음 |
| 6 | 14 | 결과 페이지 점수 제출 | Task 13 |
| 7 | 15 | achievementService | 없음 |
| 7 | 16 | AchievementModal | Task 15 |
| 8 | 17 | 일일 보너스 연동 | Task 4 |
| 8 | 18 | test/setup.ts 최종 정리 | Task 1, 13 |
| 9 | 19 | 전체 검증 | ALL |
| 9 | 20 | 문서 업데이트 | ALL |

**병렬 가능 그룹:**
- Group A: Task 1, 3, 4, 11, 13, 15 (독립적)
- Group B: Task 2, 5, 6, 7, 8 (Group A 의존)
- Group C: Task 9, 10, 12, 14, 16, 17 (Group B 의존)
- Group D: Task 18, 19, 20 (최종)
