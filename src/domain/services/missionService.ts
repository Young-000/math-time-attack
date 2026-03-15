/**
 * 미션 시스템 서비스
 * localStorage 기반 미션 달성 추적 및 보상 지급
 *
 * 카테고리: 입문(3), 연속(3), 기록(3), 마스터(3), 교환(3) = 총 15개
 */

// --- 타입 ---

export type MissionCategory = 'beginner' | 'streak' | 'record' | 'master' | 'exchange';

export type MissionDefinition = {
  id: string;
  category: MissionCategory;
  title: string;
  description: string;
  emoji: string;
  reward: number; // 별 보상
};

export type MissionProgress = {
  completed: boolean;
  completedAt: string | null;
  claimed: boolean; // 보상 수령 여부
};

type MissionStore = Record<string, MissionProgress>;

// --- 미션 정의 (15개) ---

export const MISSIONS: MissionDefinition[] = [
  // 입문 (3)
  {
    id: 'first_clear',
    category: 'beginner',
    title: '첫 게임 클리어',
    description: '게임을 처음으로 클리어하세요',
    emoji: '🎯',
    reward: 50,
  },
  {
    id: 'first_time_attack',
    category: 'beginner',
    title: '첫 타임어택 시도',
    description: '타임어택 모드를 시도하세요',
    emoji: '⚡',
    reward: 30,
  },
  {
    id: 'set_nickname',
    category: 'beginner',
    title: '닉네임 설정',
    description: '닉네임을 설정하세요',
    emoji: '✏️',
    reward: 20,
  },

  // 연속 (3)
  {
    id: 'streak_3',
    category: 'streak',
    title: '3일 연속 도전',
    description: '3일 연속으로 게임을 플레이하세요',
    emoji: '🔥',
    reward: 100,
  },
  {
    id: 'streak_7',
    category: 'streak',
    title: '7일 연속 도전',
    description: '7일 연속으로 게임을 플레이하세요',
    emoji: '⭐',
    reward: 200,
  },
  {
    id: 'streak_30',
    category: 'streak',
    title: '30일 연속 도전',
    description: '30일 연속으로 게임을 플레이하세요',
    emoji: '👑',
    reward: 500,
  },

  // 기록 (3)
  {
    id: 'clear_under_10s',
    category: 'record',
    title: '10초 이내 클리어',
    description: '쉬움 난이도를 10초 이내에 클리어하세요',
    emoji: '⏱️',
    reward: 50,
  },
  {
    id: 'all_difficulty_clear',
    category: 'record',
    title: '전 난이도 클리어',
    description: '초급/중급/고급 모든 난이도를 클리어하세요',
    emoji: '🏅',
    reward: 300,
  },
  {
    id: 'games_100',
    category: 'record',
    title: '100판 달성',
    description: '누적 100판을 플레이하세요',
    emoji: '💯',
    reward: 200,
  },

  // 마스터 (3)
  {
    id: 'perfect_5_streak',
    category: 'master',
    title: '무오답 5판 연속',
    description: '5판 연속으로 오답 없이 클리어하세요',
    emoji: '🔥',
    reward: 150,
  },
  {
    id: 'ranking_top10',
    category: 'master',
    title: '랭킹 TOP 10',
    description: '전체 랭킹 상위 10위에 진입하세요',
    emoji: '🏆',
    reward: 200,
  },
  {
    id: 'daily_all_clear',
    category: 'master',
    title: '일일 도전 올클리어',
    description: '일일 챌린지를 클리어하세요',
    emoji: '📅',
    reward: 100,
  },

  // 교환 (3)
  {
    id: 'first_exchange',
    category: 'exchange',
    title: '첫 포인트 교환',
    description: '별을 토스 포인트로 처음 교환하세요',
    emoji: '💰',
    reward: 30,
  },
  {
    id: 'exchange_100p',
    category: 'exchange',
    title: '누적 100P 교환',
    description: '누적 100 토스 포인트를 교환하세요',
    emoji: '💎',
    reward: 200,
  },
  {
    id: 'exchange_500p',
    category: 'exchange',
    title: '누적 500P 교환',
    description: '누적 500 토스 포인트를 교환하세요',
    emoji: '🌟',
    reward: 500,
  },
];

// --- localStorage ---

const MISSION_STORE_KEY = 'math-attack-missions';
const MISSION_STATS_KEY = 'math-attack-mission-stats';

type MissionStats = {
  totalGamesPlayed: number;
  totalTimeAttackPlayed: number;
  consecutivePerfectGames: number;
  clearedDifficulties: string[];
  totalExchangedPoints: number;
  exchangeCount: number;
  bestRank: number | null;
  dailyChallengeCleared: boolean;
  hasNickname: boolean;
};

function getDefaultStats(): MissionStats {
  return {
    totalGamesPlayed: 0,
    totalTimeAttackPlayed: 0,
    consecutivePerfectGames: 0,
    clearedDifficulties: [],
    totalExchangedPoints: 0,
    exchangeCount: 0,
    bestRank: null,
    dailyChallengeCleared: false,
    hasNickname: false,
  };
}

function loadMissionStore(): MissionStore {
  try {
    const stored = localStorage.getItem(MISSION_STORE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveMissionStore(store: MissionStore): void {
  try {
    localStorage.setItem(MISSION_STORE_KEY, JSON.stringify(store));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadMissionStats(): MissionStats {
  try {
    const stored = localStorage.getItem(MISSION_STATS_KEY);
    if (stored) {
      return { ...getDefaultStats(), ...JSON.parse(stored) };
    }
  } catch {
    // fallback
  }
  return getDefaultStats();
}

export function saveMissionStats(stats: MissionStats): void {
  try {
    localStorage.setItem(MISSION_STATS_KEY, JSON.stringify(stats));
  } catch {
    // localStorage full or unavailable
  }
}

// --- 통계 업데이트 헬퍼 ---

export function recordGameComplete(
  difficulty: string,
  _elapsedTime: number,
  isTimeAttack: boolean,
  isPerfect: boolean,
): void {
  const stats = loadMissionStats();

  if (isTimeAttack) {
    stats.totalTimeAttackPlayed += 1;
  } else {
    stats.totalGamesPlayed += 1;
  }

  // 연속 무오답 카운트
  if (isPerfect) {
    stats.consecutivePerfectGames += 1;
  } else {
    stats.consecutivePerfectGames = 0;
  }

  // 클리어한 난이도 기록
  if (!stats.clearedDifficulties.includes(difficulty)) {
    stats.clearedDifficulties = [...stats.clearedDifficulties, difficulty];
  }

  saveMissionStats(stats);
}

export function recordExchange(tossPoints: number): void {
  const stats = loadMissionStats();
  stats.exchangeCount += 1;
  stats.totalExchangedPoints += tossPoints;
  saveMissionStats(stats);
}

export function recordRankUpdate(rank: number): void {
  const stats = loadMissionStats();
  if (stats.bestRank === null || rank < stats.bestRank) {
    stats.bestRank = rank;
  }
  saveMissionStats(stats);
}

export function recordDailyChallengeCleared(): void {
  const stats = loadMissionStats();
  stats.dailyChallengeCleared = true;
  saveMissionStats(stats);
}

export function recordNicknameSet(): void {
  const stats = loadMissionStats();
  stats.hasNickname = true;
  saveMissionStats(stats);
}

// --- 미션 달성 체크 ---

function isMissionConditionMet(
  mission: MissionDefinition,
  stats: MissionStats,
  streakDays: number,
  elapsedTime?: number,
): boolean {
  switch (mission.id) {
    // 입문
    case 'first_clear':
      return stats.totalGamesPlayed >= 1;
    case 'first_time_attack':
      return stats.totalTimeAttackPlayed >= 1;
    case 'set_nickname':
      return stats.hasNickname;

    // 연속
    case 'streak_3':
      return streakDays >= 3;
    case 'streak_7':
      return streakDays >= 7;
    case 'streak_30':
      return streakDays >= 30;

    // 기록
    case 'clear_under_10s':
      return elapsedTime !== undefined && elapsedTime <= 10000;
    case 'all_difficulty_clear':
      return stats.clearedDifficulties.length >= 3;
    case 'games_100':
      return (stats.totalGamesPlayed + stats.totalTimeAttackPlayed) >= 100;

    // 마스터
    case 'perfect_5_streak':
      return stats.consecutivePerfectGames >= 5;
    case 'ranking_top10':
      return stats.bestRank !== null && stats.bestRank <= 10;
    case 'daily_all_clear':
      return stats.dailyChallengeCleared;

    // 교환
    case 'first_exchange':
      return stats.exchangeCount >= 1;
    case 'exchange_100p':
      return stats.totalExchangedPoints >= 100;
    case 'exchange_500p':
      return stats.totalExchangedPoints >= 500;

    default:
      return false;
  }
}

export type NewlyCompletedMission = MissionDefinition & { justCompleted: true };

/**
 * 모든 미션을 현재 통계와 대조하여 새로 달성된 미션 반환
 */
export function checkMissions(
  streakDays: number,
  currentElapsedTime?: number,
): NewlyCompletedMission[] {
  const store = loadMissionStore();
  const stats = loadMissionStats();
  const newlyCompleted: NewlyCompletedMission[] = [];

  for (const mission of MISSIONS) {
    const progress = store[mission.id];
    if (progress?.completed) continue;

    if (isMissionConditionMet(mission, stats, streakDays, currentElapsedTime)) {
      store[mission.id] = {
        completed: true,
        completedAt: new Date().toISOString(),
        claimed: false,
      };
      newlyCompleted.push({ ...mission, justCompleted: true });
    }
  }

  if (newlyCompleted.length > 0) {
    saveMissionStore(store);
  }

  return newlyCompleted;
}

/**
 * 미션 보상 수령
 * @returns 수령한 별 수 (이미 수령한 경우 0)
 */
export function claimMissionReward(missionId: string): number {
  const store = loadMissionStore();
  const progress = store[missionId];
  if (!progress?.completed || progress.claimed) return 0;

  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return 0;

  store[missionId] = { ...progress, claimed: true };
  saveMissionStore(store);

  return mission.reward;
}

/**
 * 모든 완료됐지만 미수령 미션의 보상 일괄 수령
 * @returns 수령한 총 별 수
 */
export function claimAllPendingRewards(): number {
  const store = loadMissionStore();
  let total = 0;

  for (const mission of MISSIONS) {
    const progress = store[mission.id];
    if (progress?.completed && !progress.claimed) {
      store[mission.id] = { ...progress, claimed: true };
      total += mission.reward;
    }
  }

  if (total > 0) {
    saveMissionStore(store);
  }

  return total;
}

// --- 조회 ---

export type MissionWithProgress = MissionDefinition & {
  progress: MissionProgress;
};

/**
 * 전체 미션 목록 (달성 여부 포함)
 */
export function getAllMissions(): MissionWithProgress[] {
  const store = loadMissionStore();
  return MISSIONS.map((mission) => ({
    ...mission,
    progress: store[mission.id] ?? {
      completed: false,
      completedAt: null,
      claimed: false,
    },
  }));
}

/**
 * 완료된 미션 수
 */
export function getCompletedCount(): number {
  const store = loadMissionStore();
  return MISSIONS.filter((m) => store[m.id]?.completed).length;
}

/**
 * 미수령 보상이 있는 미션 수
 */
export function getPendingRewardCount(): number {
  const store = loadMissionStore();
  return MISSIONS.filter((m) => {
    const p = store[m.id];
    return p?.completed && !p.claimed;
  }).length;
}

/**
 * 카테고리별 미션 그룹
 */
export function getMissionsByCategory(): Record<MissionCategory, MissionWithProgress[]> {
  const all = getAllMissions();
  return {
    beginner: all.filter((m) => m.category === 'beginner'),
    streak: all.filter((m) => m.category === 'streak'),
    record: all.filter((m) => m.category === 'record'),
    master: all.filter((m) => m.category === 'master'),
    exchange: all.filter((m) => m.category === 'exchange'),
  };
}

export const CATEGORY_LABELS: Record<MissionCategory, string> = {
  beginner: '입문',
  streak: '연속',
  record: '기록',
  master: '마스터',
  exchange: '교환',
};
