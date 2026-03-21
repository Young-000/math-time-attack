/**
 * 하트(기회) 시스템 서비스
 * - 최대 5개
 * - 20분마다 1개 자동 충전
 * - 광고 시청 시 +3
 * - 공유 시 +3
 * - 일일 로그인 보너스 +1
 */

const STORAGE_KEY = 'math-time-attack-hearts';
const MAX_HEARTS = 5;
const RECHARGE_INTERVAL_MS = 20 * 60 * 1000; // 20분
const DAILY_BONUS_KEY = 'math-attack-daily-bonus';

interface HeartData {
  count: number;
  lastRechargeTime: number; // timestamp
}

/**
 * 저장된 하트 데이터 로드
 */
function loadHeartData(): HeartData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load heart data:', e);
  }

  // 기본값: 풀충전 상태
  return {
    count: MAX_HEARTS,
    lastRechargeTime: Date.now(),
  };
}

/**
 * 하트 데이터 저장
 */
function saveHeartData(data: HeartData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save heart data:', e);
  }
}

/**
 * 시간 경과에 따른 자동 충전 계산
 */
function calculateRechargedHearts(data: HeartData): HeartData {
  const now = Date.now();
  const elapsed = now - data.lastRechargeTime;
  const rechargedCount = Math.floor(elapsed / RECHARGE_INTERVAL_MS);

  if (rechargedCount <= 0 || data.count >= MAX_HEARTS) {
    return data;
  }

  const newCount = Math.min(MAX_HEARTS, data.count + rechargedCount);
  const newLastRechargeTime = data.lastRechargeTime + (rechargedCount * RECHARGE_INTERVAL_MS);

  return {
    count: newCount,
    lastRechargeTime: newLastRechargeTime,
  };
}

/**
 * 현재 하트 개수 조회 (자동 충전 반영)
 */
export function getHeartCount(): number {
  const data = loadHeartData();
  const updated = calculateRechargedHearts(data);

  if (updated !== data) {
    saveHeartData(updated);
  }

  return updated.count;
}

/**
 * 하트 사용 (1개 차감)
 * @returns 성공 여부
 */
export function consumeHeart(): boolean {
  const data = loadHeartData();
  const updated = calculateRechargedHearts(data);

  if (updated.count <= 0) {
    return false;
  }

  saveHeartData({
    count: updated.count - 1,
    lastRechargeTime: updated.lastRechargeTime,
  });

  return true;
}

/**
 * 하트 풀충전
 */
export function refillHearts(): void {
  saveHeartData({
    count: MAX_HEARTS,
    lastRechargeTime: Date.now(),
  });
}

/**
 * 하트 N개 추가 (최대치 초과 불가)
 */
export function addHearts(amount: number): void {
  const data = loadHeartData();
  const updated = calculateRechargedHearts(data);
  const newCount = Math.min(MAX_HEARTS, updated.count + amount);
  saveHeartData({
    count: newCount,
    lastRechargeTime: updated.lastRechargeTime,
  });
}

/**
 * 일일 로그인 보너스 수령 (+1 하트)
 * @returns 성공 여부 (이미 수령했으면 false)
 */
export function claimDailyLoginBonus(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const lastClaimed = localStorage.getItem(DAILY_BONUS_KEY);
    if (lastClaimed === today) {
      return false;
    }
    addHearts(1);
    localStorage.setItem(DAILY_BONUS_KEY, today);
    return true;
  } catch {
    return false;
  }
}

/**
 * 오늘 일일 보너스를 이미 받았는지 확인
 */
export function hasDailyBonusClaimed(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  try {
    return localStorage.getItem(DAILY_BONUS_KEY) === today;
  } catch {
    return false;
  }
}

/**
 * 다음 하트 충전까지 남은 시간 (ms)
 * 이미 풀충전이면 0 반환
 */
export function getTimeUntilNextHeart(): number {
  const data = loadHeartData();
  const updated = calculateRechargedHearts(data);

  if (updated.count >= MAX_HEARTS) {
    return 0;
  }

  const now = Date.now();
  const nextRechargeTime = updated.lastRechargeTime + RECHARGE_INTERVAL_MS;
  return Math.max(0, nextRechargeTime - now);
}

/**
 * 남은 시간을 "MM분" 또는 "M분 SS초" 형식으로 포맷
 */
export function formatTimeUntilNextHeart(ms: number): string {
  if (ms <= 0) return '충전 완료';

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}시간 ${remainingMinutes}분`;
  }

  if (seconds === 0) {
    return `${minutes}분`;
  }

  return `${minutes}분 ${seconds}초`;
}

/**
 * 하트 정보 전체 조회
 */
export interface HeartInfo {
  count: number;
  maxHearts: number;
  timeUntilNext: number;
  timeUntilNextFormatted: string;
  isFull: boolean;
}

export function getHeartInfo(): HeartInfo {
  const count = getHeartCount();
  const timeUntilNext = getTimeUntilNextHeart();

  return {
    count,
    maxHearts: MAX_HEARTS,
    timeUntilNext,
    timeUntilNextFormatted: formatTimeUntilNextHeart(timeUntilNext),
    isFull: count >= MAX_HEARTS,
  };
}

// 상수 export
export { MAX_HEARTS, RECHARGE_INTERVAL_MS, DAILY_BONUS_KEY };
