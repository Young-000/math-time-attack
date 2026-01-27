-- 타임어택 기록 테이블 생성
-- Schema: math_attack

-- 1. 타임어택 기록 테이블
CREATE TABLE IF NOT EXISTS math_attack.time_attack_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odl_id VARCHAR NOT NULL,
  difficulty VARCHAR NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  operation VARCHAR NOT NULL CHECK (operation IN ('addition', 'multiplication', 'mixed')),
  score INTEGER NOT NULL CHECK (score >= 0),  -- 정답 개수
  wrong_count INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
  played_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS time_attack_records_odl_id_idx
  ON math_attack.time_attack_records(odl_id);

CREATE INDEX IF NOT EXISTS time_attack_records_ranking_idx
  ON math_attack.time_attack_records(difficulty, operation, score DESC);

CREATE INDEX IF NOT EXISTS time_attack_records_best_score_idx
  ON math_attack.time_attack_records(odl_id, difficulty, operation, score DESC);

-- 3. RLS 활성화
ALTER TABLE math_attack.time_attack_records ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
CREATE POLICY time_attack_records_select_all
  ON math_attack.time_attack_records FOR SELECT
  USING (true);

CREATE POLICY time_attack_records_insert_all
  ON math_attack.time_attack_records FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RPC 함수 (public 스키마에 wrapper 생성)
-- ============================================

-- 5. 타임어택 기록 삽입 함수
CREATE OR REPLACE FUNCTION public.insert_time_attack_record(
  p_odl_id VARCHAR,
  p_difficulty VARCHAR,
  p_operation VARCHAR,
  p_score INTEGER,
  p_wrong_count INTEGER,
  p_played_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO math_attack.time_attack_records (
    odl_id, difficulty, operation, score, wrong_count, played_at
  ) VALUES (
    p_odl_id, p_difficulty, p_operation, p_score, p_wrong_count, p_played_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 6. 타임어택 랭킹 조회 함수 (사용자별 최고 점수)
CREATE OR REPLACE FUNCTION public.get_time_attack_rankings(
  p_difficulty VARCHAR,
  p_operation VARCHAR DEFAULT 'multiplication',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank BIGINT,
  odl_id VARCHAR,
  nickname VARCHAR,
  best_score INTEGER,
  played_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH best_scores AS (
    SELECT DISTINCT ON (r.odl_id)
      r.odl_id,
      r.score AS best_score,
      r.played_at
    FROM math_attack.time_attack_records r
    WHERE r.difficulty = p_difficulty
      AND r.operation = p_operation
    ORDER BY r.odl_id, r.score DESC, r.played_at ASC
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY bs.best_score DESC, bs.played_at ASC) AS rank,
      bs.odl_id,
      bs.best_score,
      bs.played_at
    FROM best_scores bs
    ORDER BY bs.best_score DESC, bs.played_at ASC
    LIMIT p_limit
  )
  SELECT
    r.rank,
    r.odl_id,
    up.nickname,
    r.best_score,
    r.played_at
  FROM ranked r
  LEFT JOIN math_attack.user_profiles up ON r.odl_id = up.odl_id;
END;
$$;

-- 7. 내 타임어택 순위 정보 조회 함수
CREATE OR REPLACE FUNCTION public.get_time_attack_rank_info(
  p_odl_id VARCHAR,
  p_difficulty VARCHAR,
  p_operation VARCHAR DEFAULT 'multiplication'
)
RETURNS TABLE (
  my_rank BIGINT,
  my_best_score INTEGER,
  my_percentile NUMERIC,
  total_players BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_best_score INTEGER;
  v_rank BIGINT;
  v_total BIGINT;
BEGIN
  -- 내 최고 점수 조회
  SELECT MAX(r.score) INTO v_best_score
  FROM math_attack.time_attack_records r
  WHERE r.odl_id = p_odl_id
    AND r.difficulty = p_difficulty
    AND r.operation = p_operation;

  -- 기록이 없으면 NULL 반환
  IF v_best_score IS NULL THEN
    RETURN QUERY SELECT NULL::BIGINT, NULL::INTEGER, NULL::NUMERIC, 0::BIGINT;
    RETURN;
  END IF;

  -- 전체 플레이어 수 (해당 난이도/연산)
  SELECT COUNT(DISTINCT r.odl_id) INTO v_total
  FROM math_attack.time_attack_records r
  WHERE r.difficulty = p_difficulty
    AND r.operation = p_operation;

  -- 나보다 높은 점수를 가진 플레이어 수 + 1 = 내 순위
  SELECT COUNT(DISTINCT r.odl_id) + 1 INTO v_rank
  FROM math_attack.time_attack_records r
  WHERE r.difficulty = p_difficulty
    AND r.operation = p_operation
    AND (
      SELECT MAX(r2.score)
      FROM math_attack.time_attack_records r2
      WHERE r2.odl_id = r.odl_id
        AND r2.difficulty = p_difficulty
        AND r2.operation = p_operation
    ) > v_best_score;

  RETURN QUERY
  SELECT
    v_rank,
    v_best_score,
    CASE WHEN v_total > 0
      THEN ROUND((1 - (v_rank::NUMERIC - 1) / v_total) * 100, 1)
      ELSE NULL
    END,
    v_total;
END;
$$;

-- 8. 타임어택 전체 플레이어 수 조회
CREATE OR REPLACE FUNCTION public.get_time_attack_total_players(
  p_difficulty VARCHAR,
  p_operation VARCHAR DEFAULT 'multiplication'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT odl_id) INTO v_count
  FROM math_attack.time_attack_records
  WHERE difficulty = p_difficulty
    AND operation = p_operation;

  RETURN v_count;
END;
$$;
