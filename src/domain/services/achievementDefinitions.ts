/**
 * 업적 정의 상수
 */

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  emoji: string;
  heartReward: number; // 0이면 보상 없음 (칭호만)
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
