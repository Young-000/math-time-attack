-- 주간 랭킹 필터 지원을 위한 RPC 함수 업데이트
-- p_since 파라미터 추가 (NULL이면 전체 기간, 값이 있으면 해당 시점 이후만 필터)

-- ⚠️ 기존 3-param 함수와의 오버로딩 충돌 방지를 위해 먼저 DROP
DROP FUNCTION IF EXISTS public.get_top_rankings(VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS public.get_top_rankings(VARCHAR, VARCHAR, INTEGER, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_time_attack_rankings(VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS public.get_time_attack_rankings(VARCHAR, VARCHAR, INTEGER, TIMESTAMPTZ);

-- 1. get_top_rankings (클래식 모드) - p_since DEFAULT NULL
CREATE FUNCTION public.get_top_rankings(
  p_difficulty VARCHAR,
  p_operation VARCHAR DEFAULT 'multiplication',
  p_limit INTEGER DEFAULT 100,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  rank BIGINT,
  odl_id VARCHAR,
  nickname VARCHAR,
  best_time INTEGER,
  played_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH best_times AS (
    SELECT DISTINCT ON (r.odl_id)
      r.odl_id,
      r.time AS best_time,
      r.played_at
    FROM math_attack.game_records r
    WHERE r.difficulty = p_difficulty
      AND r.operation = p_operation
      AND (p_since IS NULL OR r.played_at >= p_since)
    ORDER BY r.odl_id, r.time ASC, r.played_at ASC
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY bt.best_time ASC, bt.played_at ASC) AS rank,
      bt.odl_id,
      bt.best_time,
      bt.played_at
    FROM best_times bt
    ORDER BY bt.best_time ASC, bt.played_at ASC
    LIMIT p_limit
  )
  SELECT
    r.rank,
    r.odl_id,
    up.nickname,
    r.best_time,
    r.played_at
  FROM ranked r
  LEFT JOIN math_attack.user_profiles up ON r.odl_id = up.odl_id;
END;
$$;

-- 2. get_time_attack_rankings (타임어택 모드) - p_since DEFAULT NULL
CREATE FUNCTION public.get_time_attack_rankings(
  p_difficulty VARCHAR,
  p_operation VARCHAR DEFAULT 'multiplication',
  p_limit INTEGER DEFAULT 100,
  p_since TIMESTAMPTZ DEFAULT NULL
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
      AND (p_since IS NULL OR r.played_at >= p_since)
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
