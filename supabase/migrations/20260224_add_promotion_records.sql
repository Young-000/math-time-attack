-- promotion_records: 서버 측 프로모션 지급 기록
-- Edge Function에서 토스 프로모션 API 3단계 플로우 (get-key -> execute -> result) 결과를 저장한다.
-- user_key + promotion_code 조합으로 중복 지급을 서버 측에서 방지.

CREATE TABLE IF NOT EXISTS math_attack.promotion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR NOT NULL,
  promotion_code VARCHAR NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  promotion_key VARCHAR,          -- get-key API 응답의 key
  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),
  error_code VARCHAR,             -- 실패 시 토스 에러 코드
  error_message TEXT,             -- 실패 시 에러 메시지
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT promotion_records_unique UNIQUE (user_key, promotion_code)
);

-- 인덱스: user_key 기준 조회 최적화
CREATE INDEX IF NOT EXISTS promotion_records_user_key_idx
  ON math_attack.promotion_records (user_key);

-- 인덱스: status 기반 조회 (pending 건 재처리 등)
CREATE INDEX IF NOT EXISTS promotion_records_status_idx
  ON math_attack.promotion_records (status);

-- RLS 활성화: service_role만 접근 가능 (Edge Function에서만 사용)
ALTER TABLE math_attack.promotion_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY promotion_records_service_only
  ON math_attack.promotion_records
  FOR ALL
  USING (auth.role() = 'service_role');

-- 코멘트
COMMENT ON TABLE math_attack.promotion_records IS '프로모션(토스 포인트) 지급 기록. Edge Function(service_role)만 접근.';
COMMENT ON COLUMN math_attack.promotion_records.user_key IS '토스 유저 고유 식별키';
COMMENT ON COLUMN math_attack.promotion_records.promotion_code IS '앱인토스 콘솔에서 생성한 프로모션 코드';
COMMENT ON COLUMN math_attack.promotion_records.amount IS '지급 금액 (토스 포인트)';
COMMENT ON COLUMN math_attack.promotion_records.promotion_key IS 'get-key API에서 발급받은 프로모션 실행 키 (유효기간 1시간)';
COMMENT ON COLUMN math_attack.promotion_records.status IS '지급 상태: pending(진행중), success(성공), failed(실패)';
COMMENT ON COLUMN math_attack.promotion_records.error_code IS '실패 시 토스 API 에러 코드 (예: CE1000)';
COMMENT ON COLUMN math_attack.promotion_records.error_message IS '실패 시 에러 상세 메시지';
