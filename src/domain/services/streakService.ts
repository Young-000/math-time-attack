/**
 * 연속 출석 서비스
 * 7일 연속 플레이 추적 및 보상 시스템
 */

const STREAK_STORAGE_KEY = 'math-time-attack-streak';

interface StreakData {
  currentStreak: number;       // 현재 연속 출석 일수
  lastPlayDate: string;        // 마지막 플레이 날짜 (YYYY-MM-DD)
  totalDays: number;           // 총 플레이 일수
  longestStreak: number;       // 최장 연속 기록
  weekHistory: string[];       // 이번 주 출석 기록 (날짜 배열)
}

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD)
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 어제 날짜 문자열 반환
 */
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * 이번 주 시작일 (일요일) 반환
 */
function getWeekStartDate(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * 이번 주의 날짜 배열 반환 (일~토)
 */
function getWeekDates(): string[] {
  const weekStart = getWeekStartDate();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date.toISOString().split('T')[0];
  });
}

/**
 * 기본 출석 데이터
 */
function getDefaultStreakData(): StreakData {
  return {
    currentStreak: 0,
    lastPlayDate: '',
    totalDays: 0,
    longestStreak: 0,
    weekHistory: [],
  };
}

/**
 * 출석 데이터 조회
 */
export function getStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!stored) return getDefaultStreakData();

    const data = JSON.parse(stored) as StreakData;

    // 연속 출석 체크: 어제 또는 오늘이 아니면 리셋
    const today = getTodayString();
    const yesterday = getYesterdayString();

    if (data.lastPlayDate !== today && data.lastPlayDate !== yesterday) {
      // 연속 출석 끊김
      return {
        ...data,
        currentStreak: 0,
      };
    }

    return data;
  } catch {
    return getDefaultStreakData();
  }
}

/**
 * 출석 데이터 저장
 */
function saveStreakData(data: StreakData): void {
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save streak data');
  }
}

/**
 * 오늘 출석 체크
 * @returns 연속 출석 일수 (업데이트 후)
 */
export function checkIn(): number {
  const today = getTodayString();
  const data = getStreakData();

  // 이미 오늘 체크인 했으면 현재 스트릭 반환
  if (data.lastPlayDate === today) {
    return data.currentStreak;
  }

  const yesterday = getYesterdayString();
  let newStreak: number;

  if (data.lastPlayDate === yesterday) {
    // 연속 출석
    newStreak = data.currentStreak + 1;
  } else {
    // 첫 출석 또는 끊김 후 재시작
    newStreak = 1;
  }

  // 이번 주 히스토리 업데이트
  const weekDates = getWeekDates();
  const updatedWeekHistory = data.weekHistory.filter(d => weekDates.includes(d));
  if (!updatedWeekHistory.includes(today)) {
    updatedWeekHistory.push(today);
  }

  const updatedData: StreakData = {
    currentStreak: newStreak,
    lastPlayDate: today,
    totalDays: data.totalDays + 1,
    longestStreak: Math.max(data.longestStreak, newStreak),
    weekHistory: updatedWeekHistory,
  };

  saveStreakData(updatedData);
  return newStreak;
}

/**
 * 오늘 출석 여부 확인
 */
export function isCheckedInToday(): boolean {
  const data = getStreakData();
  return data.lastPlayDate === getTodayString();
}

/**
 * 현재 연속 출석 일수
 */
export function getCurrentStreak(): number {
  return getStreakData().currentStreak;
}

/**
 * 최장 연속 기록
 */
export function getLongestStreak(): number {
  return getStreakData().longestStreak;
}

/**
 * 총 플레이 일수
 */
export function getTotalDays(): number {
  return getStreakData().totalDays;
}

/**
 * 이번 주 출석 현황
 * @returns 각 요일의 출석 여부 (일~토)
 */
export function getWeekAttendance(): boolean[] {
  const data = getStreakData();
  const weekDates = getWeekDates();

  return weekDates.map(date => data.weekHistory.includes(date));
}

/**
 * 7일 완주 여부
 */
export function isWeekComplete(): boolean {
  const attendance = getWeekAttendance();
  return attendance.every(Boolean);
}

/**
 * 스트릭 마일스톤 체크
 * @returns 달성한 마일스톤 (3, 7, 14, 30일 등)
 */
export function getStreakMilestone(streak: number): number | null {
  const milestones = [3, 7, 14, 30, 50, 100];
  return milestones.find(m => m === streak) ?? null;
}

/**
 * 스트릭 마일스톤 메시지
 */
export function getStreakMilestoneMessage(streak: number): { emoji: string; message: string } | null {
  const milestone = getStreakMilestone(streak);
  if (!milestone) return null;

  const messages: Record<number, { emoji: string; message: string }> = {
    3: { emoji: '🔥', message: '3일 연속 달성!' },
    7: { emoji: '⭐', message: '1주 완주!' },
    14: { emoji: '🏆', message: '2주 연속!' },
    30: { emoji: '👑', message: '30일 마스터!' },
    50: { emoji: '💎', message: '50일 전설!' },
    100: { emoji: '🎖️', message: '100일 신화!' },
  };

  return messages[milestone] || null;
}

/**
 * 요일 이름 반환
 */
export function getDayName(index: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[index];
}
