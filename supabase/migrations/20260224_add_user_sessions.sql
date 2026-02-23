-- user_sessions: 서버 측 토큰 저장
-- appLogin() -> Edge Function -> Toss Partner API 토큰 교환 결과를 저장한다.
-- AccessToken, RefreshToken은 서버 측에서만 관리하며 클라이언트에는 userKey만 전달.

CREATE TABLE IF NOT EXISTS math_attack.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_sessions_user_key_unique UNIQUE (user_key)
);

-- 인덱스: user_key 조회 최적화 (UNIQUE 제약조건이 이미 인덱스를 생성하지만 명시)
CREATE INDEX IF NOT EXISTS user_sessions_user_key_idx
  ON math_attack.user_sessions (user_key);

-- token_expires_at 기반 만료 세션 정리용 인덱스
CREATE INDEX IF NOT EXISTS user_sessions_token_expires_at_idx
  ON math_attack.user_sessions (token_expires_at);

-- RLS 활성화: service_role만 접근 가능
ALTER TABLE math_attack.user_sessions ENABLE ROW LEVEL SECURITY;

-- service_role만 모든 CRUD 가능 (anon key로는 접근 불가)
CREATE POLICY user_sessions_service_only
  ON math_attack.user_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- 코멘트
COMMENT ON TABLE math_attack.user_sessions IS 'appLogin 인증 토큰 서버 측 저장소. Edge Function(service_role)만 접근.';
COMMENT ON COLUMN math_attack.user_sessions.user_key IS '토스 유저 고유 식별키 (accessToken JWT에서 추출)';
COMMENT ON COLUMN math_attack.user_sessions.access_token IS '토스 파트너 API AccessToken (서버 측 only)';
COMMENT ON COLUMN math_attack.user_sessions.refresh_token IS '토스 파트너 API RefreshToken (서버 측 only)';
COMMENT ON COLUMN math_attack.user_sessions.token_expires_at IS 'AccessToken 만료 시각';
