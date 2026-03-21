/**
 * 미션 시스템 — 트랙/스테이지 기반 + 일일 미션
 *
 * [트랙 미션] 4개 트랙, 각 3~5 스테이지. 현재 스테이지만 표시.
 * 스테이지 보상: 50, 60, 80, 100 (프로그레시브)
 *
 * [일일 미션] 매일 리셋, 4개 중 ~3개 달성 가능 = ~200별/일
 */

// --- Track/Stage types ---

export type MissionStage = {
  readonly level: number;
  readonly target: number;
  readonly reward: number;
  readonly description: string;
};

export type MissionTrack = {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly stages: readonly MissionStage[];
};

export type MissionProgress = {
  readonly trackId: string;
  readonly currentLevel: number;
  readonly progress: number;
  readonly completedAt?: string;
};

export type MissionState = Record<string, MissionProgress>;

// --- Track definitions ---

export const MISSION_TRACKS: readonly MissionTrack[] = [
  {
    id: 'challenger',
    name: '도전자',
    emoji: '🎯',
    stages: [
      { level: 1, target: 1, reward: 50, description: '게임 1회 클리어' },
      { level: 2, target: 5, reward: 60, description: '게임 5회 클리어' },
      { level: 3, target: 20, reward: 80, description: '게임 20회 클리어' },
      { level: 4, target: 50, reward: 100, description: '게임 50회 클리어' },
    ],
  },
  {
    id: 'streak',
    name: '연속 도전',
    emoji: '🔥',
    stages: [
      { level: 1, target: 3, reward: 50, description: '3일 연속 도전' },
      { level: 2, target: 7, reward: 60, description: '7일 연속 도전' },
      { level: 3, target: 14, reward: 80, description: '14일 연속 도전' },
      { level: 4, target: 30, reward: 100, description: '30일 연속 도전' },
    ],
  },
  {
    id: 'master',
    name: '구구단 마스터',
    emoji: '⭐',
    stages: [
      { level: 1, target: 1, reward: 50, description: '타임어택 1회 시도' },
      { level: 2, target: 5, reward: 60, description: '타임어택 5회 시도' },
      { level: 3, target: 20, reward: 80, description: '타임어택 20회 시도' },
      { level: 4, target: 50, reward: 100, description: '타임어택 50회 시도' },
    ],
  },
] as const;

// Track totals: 290 + 290 + 290 = 870 (one-time, spread across weeks)

// --- Daily missions (reset every day) ---

export type DailyMission = {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly target: number;
  readonly reward: number;
  readonly description: string;
};

export const DAILY_MISSIONS: readonly DailyMission[] = [
  { id: 'daily_play_3', name: '오늘의 연습', emoji: '📝', target: 3, reward: 50, description: '오늘 게임 3회 클리어' },
  { id: 'daily_play_7', name: '열공 모드', emoji: '📚', target: 7, reward: 60, description: '오늘 게임 7회 클리어' },
  { id: 'daily_play_12', name: '연습의 왕', emoji: '👑', target: 12, reward: 80, description: '오늘 게임 12회 클리어' },
  { id: 'daily_challenge', name: '일일 챌린지', emoji: '🏅', target: 1, reward: 100, description: '일일 챌린지 완료' },
] as const;

// Daily mission totals: 50+60+80+100 = 290 (all), typical ~200/day (3 of 4)

type DailyMissionState = {
  date: string;
  completed: Record<string, boolean>;
  dailyGamesPlayed: number;
  dailyChallengeCleared: boolean;
};

const DAILY_MISSION_KEY = 'math-attack-daily-missions';

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadDailyMissionState(): DailyMissionState {
  try {
    const stored = localStorage.getItem(DAILY_MISSION_KEY);
    if (stored) {
      const data = JSON.parse(stored) as DailyMissionState;
      if (data.date === getTodayStr()) return data;
    }
  } catch { /* fallback */ }
  return { date: getTodayStr(), completed: {}, dailyGamesPlayed: 0, dailyChallengeCleared: false };
}

function saveDailyMissionState(state: DailyMissionState): void {
  try {
    localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function incrementDailyGameCount(): void {
  const state = loadDailyMissionState();
  state.dailyGamesPlayed += 1;
  saveDailyMissionState(state);
}

export function markDailyChallengeComplete(): void {
  const state = loadDailyMissionState();
  state.dailyChallengeCleared = true;
  saveDailyMissionState(state);
}

function getDailyMissionValue(missionId: string, state: DailyMissionState): number {
  switch (missionId) {
    case 'daily_play_3':
    case 'daily_play_7':
    case 'daily_play_12':
      return state.dailyGamesPlayed;
    case 'daily_challenge':
      return state.dailyChallengeCleared ? 1 : 0;
    default:
      return 0;
  }
}

export type CompletedDailyMission = {
  readonly missionId: string;
  readonly name: string;
  readonly emoji: string;
  readonly reward: number;
};

export function checkDailyMissions(): readonly CompletedDailyMission[] {
  const state = loadDailyMissionState();
  const completed: CompletedDailyMission[] = [];

  for (const mission of DAILY_MISSIONS) {
    if (state.completed[mission.id]) continue;
    const value = getDailyMissionValue(mission.id, state);
    if (value >= mission.target) {
      completed.push({
        missionId: mission.id,
        name: mission.name,
        emoji: mission.emoji,
        reward: mission.reward,
      });
      state.completed[mission.id] = true;
    }
  }

  if (completed.length > 0) saveDailyMissionState(state);
  return completed;
}

export function getDailyMissionProgress(): readonly {
  mission: DailyMission;
  current: number;
  isCompleted: boolean;
}[] {
  const state = loadDailyMissionState();
  return DAILY_MISSIONS.map((mission) => {
    const value = getDailyMissionValue(mission.id, state);
    return {
      mission,
      current: Math.min(value, mission.target),
      isCompleted: !!state.completed[mission.id],
    };
  });
}

// --- Mission context ---

export type MissionContext = {
  readonly totalGamesPlayed: number;
  readonly currentStreak: number;
  readonly totalTimeAttackPlayed: number;
};

// --- localStorage ---

const STORAGE_KEY = 'math-attack-track-missions';
const COUNTERS_KEY = 'math-attack-track-counters';

type MissionCounters = {
  totalGamesPlayed: number;
  totalTimeAttackPlayed: number;
  currentStreak: number;
};

function loadState(): MissionState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as MissionState;
  } catch { /* fallback */ }
  return {};
}

function saveState(state: MissionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function loadCounters(): MissionCounters {
  try {
    const stored = localStorage.getItem(COUNTERS_KEY);
    if (stored) return { totalGamesPlayed: 0, totalTimeAttackPlayed: 0, currentStreak: 0, ...JSON.parse(stored) };
  } catch { /* fallback */ }
  return { totalGamesPlayed: 0, totalTimeAttackPlayed: 0, currentStreak: 0 };
}

function saveCounters(counters: MissionCounters): void {
  try {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
  } catch { /* ignore */ }
}

// --- Counter helpers ---

export function updateStreak(streak: number): void {
  const c = loadCounters();
  c.currentStreak = streak;
  saveCounters(c);
}

export function buildContext(): MissionContext {
  const c = loadCounters();
  return {
    totalGamesPlayed: c.totalGamesPlayed,
    currentStreak: c.currentStreak,
    totalTimeAttackPlayed: c.totalTimeAttackPlayed,
  };
}

// --- Pure functions ---

function getTrackValue(trackId: string, context: MissionContext): number {
  switch (trackId) {
    case 'challenger': return context.totalGamesPlayed + context.totalTimeAttackPlayed;
    case 'streak': return context.currentStreak;
    case 'master': return context.totalTimeAttackPlayed;
    default: return 0;
  }
}

export function getCurrentStage(
  track: MissionTrack,
  state: MissionState,
): MissionStage | null {
  const progress = state[track.id];
  const currentLevel = progress?.currentLevel ?? 1;
  if (progress?.completedAt) return null;
  return track.stages.find((s) => s.level === currentLevel) ?? null;
}

export function getTrackProgress(
  track: MissionTrack,
  state: MissionState,
  context: MissionContext,
): { current: number; target: number; isCompleted: boolean } {
  const stage = getCurrentStage(track, state);
  if (!stage) {
    const lastStage = track.stages[track.stages.length - 1];
    return { current: lastStage?.target ?? 0, target: lastStage?.target ?? 0, isCompleted: true };
  }
  const value = getTrackValue(track.id, context);
  return { current: Math.min(value, stage.target), target: stage.target, isCompleted: false };
}

export type CompletedStage = {
  readonly trackId: string;
  readonly trackName: string;
  readonly trackEmoji: string;
  readonly level: number;
  readonly reward: number;
};

export function checkAndAdvanceMissions(context: MissionContext): readonly CompletedStage[] {
  const state = loadState();
  const completed: CompletedStage[] = [];

  for (const track of MISSION_TRACKS) {
    const stage = getCurrentStage(track, state);
    if (!stage) continue;
    const value = getTrackValue(track.id, context);
    if (value < stage.target) continue;

    completed.push({
      trackId: track.id, trackName: track.name, trackEmoji: track.emoji,
      level: stage.level, reward: stage.reward,
    });

    const nextStage = track.stages.find((s) => s.level === stage.level + 1);
    if (nextStage) {
      state[track.id] = { trackId: track.id, currentLevel: nextStage.level, progress: value };
    } else {
      state[track.id] = { trackId: track.id, currentLevel: stage.level, progress: value, completedAt: new Date().toISOString() };
    }
  }

  if (completed.length > 0) saveState(state);
  return completed;
}

export function getMissionState(): MissionState {
  return loadState();
}

export function getCompletedStageCount(): number {
  const state = loadState();
  let count = 0;
  for (const track of MISSION_TRACKS) {
    const progress = state[track.id];
    if (!progress) continue;
    if (progress.completedAt) { count += track.stages.length; }
    else { count += progress.currentLevel - 1; }
  }
  return count;
}

export function getTotalStageCount(): number {
  return MISSION_TRACKS.reduce((sum, t) => sum + t.stages.length, 0);
}

// Legacy compatibility
export const MISSIONS: readonly { id: string; reward: number }[] = [];

export type NewlyCompletedMission = { id: string; title: string; reward: number; emoji: string; justCompleted: true };

export function checkMissions(
  _streakDays?: number,
  _elapsedTime?: number,
): NewlyCompletedMission[] {
  const ctx = buildContext();
  const stages = checkAndAdvanceMissions(ctx);
  return stages.map((s) => ({
    id: s.trackId,
    title: `${s.trackName} Lv.${s.level}`,
    reward: s.reward,
    emoji: s.trackEmoji,
    justCompleted: true as const,
  }));
}

export function loadMissionStats(): Record<string, unknown> { return {}; }
export function saveMissionStats(_stats: Record<string, unknown>): void { /* noop */ }

export function recordGameComplete(
  _difficulty: string,
  _elapsedTime: number,
  isTimeAttack: boolean,
  _isPerfect: boolean,
): void {
  const c = loadCounters();
  if (isTimeAttack) { c.totalTimeAttackPlayed += 1; } else { c.totalGamesPlayed += 1; }
  saveCounters(c);
}

export function recordExchange(_tossPoints: number): void { /* noop */ }
export function recordRankUpdate(_rank: number): void { /* noop */ }
export function recordDailyChallengeCleared(): void { /* noop */ }
export function recordNicknameSet(): void { /* noop */ }

export function claimMissionReward(_missionId: string): number { return 0; }
export function claimAllPendingRewards(): number { return 0; }

export type MissionWithProgress = { id: string; category: string; title: string; description: string; emoji: string; reward: number; progress: { completed: boolean; completedAt: string | null; claimed: boolean } };
export function getAllMissions(): MissionWithProgress[] { return []; }
export function getCompletedCount(): number { return getCompletedStageCount(); }
export function getPendingRewardCount(): number { return 0; }

export type MissionCategory = string;
export type MissionDefinition = { id: string; category: string; title: string; description: string; emoji: string; reward: number };
export const CATEGORY_LABELS: Record<string, string> = {};
export function getMissionsByCategory(): Record<string, MissionWithProgress[]> { return {}; }
