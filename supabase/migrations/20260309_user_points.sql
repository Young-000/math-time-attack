-- 유저 포인트 잔액
CREATE TABLE math_attack.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 포인트 거래 내역
CREATE TABLE math_attack.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  amount INTEGER NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN (
    'game_complete', 'weekly_reward', 'monthly_reward',
    'daily_login', 'exchange', 'admin'
  )),
  description VARCHAR,
  reference_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 챌린지 보상 기록 (중복 지급 방지)
CREATE TABLE math_attack.challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  challenge_type VARCHAR NOT NULL CHECK (challenge_type IN ('weekly', 'monthly')),
  period_key VARCHAR NOT NULL,
  rank INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT challenge_rewards_unique UNIQUE (user_key, challenge_type, period_key)
);

-- 명예의 전당
CREATE TABLE math_attack.hall_of_fame (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  nickname VARCHAR,
  challenge_type VARCHAR NOT NULL CHECK (challenge_type IN ('weekly', 'monthly')),
  period_key VARCHAR NOT NULL,
  period_label VARCHAR NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL,
  difficulty VARCHAR NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT hall_of_fame_unique UNIQUE (challenge_type, period_key, rank, difficulty)
);

-- 포인트 교환 기록
CREATE TABLE math_attack.point_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  stars_spent INTEGER NOT NULL CHECK (stars_spent > 0),
  toss_points INTEGER NOT NULL CHECK (toss_points > 0),
  promotion_code VARCHAR NOT NULL,
  promotion_key VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX point_transactions_user_key_idx ON math_attack.point_transactions (user_key);
CREATE INDEX point_transactions_created_at_idx ON math_attack.point_transactions (created_at);
CREATE INDEX challenge_rewards_period_idx ON math_attack.challenge_rewards (challenge_type, period_key);
CREATE INDEX hall_of_fame_type_period_idx ON math_attack.hall_of_fame (challenge_type, period_key);

-- RLS 활성화
ALTER TABLE math_attack.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_attack.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_attack.challenge_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_attack.hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_attack.point_exchanges ENABLE ROW LEVEL SECURITY;
