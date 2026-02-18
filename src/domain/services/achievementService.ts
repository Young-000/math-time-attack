/**
 * 업적 시스템 서비스
 * - localStorage 기반 달성 체크
 * - 조건별 업적 달성 판정
 * - 보상 지급 연동
 */

import { ACHIEVEMENTS, type AchievementDefinition } from './achievementDefinitions';

const ACHIEVED_KEY = 'math-attack-achievements';

export interface AchievementContext {
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

function saveAchievedKeys(keys: Set<string>): void {
  localStorage.setItem(ACHIEVED_KEY, JSON.stringify([...keys]));
}

export function markAchieved(key: string): void {
  const achieved = getAchievedKeys();
  achieved.add(key);
  saveAchievedKeys(achieved);
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
