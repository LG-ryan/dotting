-- ============================================
-- Migration 003: Analytics Events + Interview OS
-- 목적: 데이터 자산 구축 (퍼널/품질 지표) + Interview OS 상태
-- ============================================

-- 1. sessions 테이블에 interview_state 컬럼 추가
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS interview_state JSONB DEFAULT '{
  "fatigue_score": 0,
  "current_slot": "scene",
  "slot_cycle_count": 0,
  "short_answer_count": 0,
  "last_question_type": null
}'::jsonb;

COMMENT ON COLUMN sessions.interview_state IS 'Interview OS 상태: 피로도, 슬롯 사이클, 짧은 답변 카운트 등';

-- 2. Analytics Events 테이블 생성
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- 행위자 식별 (둘 중 하나만 채움)
  user_id UUID REFERENCES public.users(id),           -- 자녀 (nullable)
  respondent_token_hash TEXT,                          -- 응답자 HMAC 해시 (nullable)
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'respondent', 'system', 'admin')),
  
  -- 이벤트 정보
  event_name TEXT NOT NULL,   -- question_generated, answer_received, etc.
  event_data JSONB NOT NULL,  -- 유연한 payload
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;

-- RLS: 이벤트는 감사 로그 성격 (불변)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "User can view own session events" ON analytics_events;
DROP POLICY IF EXISTS "No client insert on analytics events" ON analytics_events;
DROP POLICY IF EXISTS "No update on analytics events" ON analytics_events;
DROP POLICY IF EXISTS "No delete on analytics events" ON analytics_events;

-- SELECT: 자녀는 자기 세션만 조회 가능
CREATE POLICY "User can view own session events"
ON analytics_events FOR SELECT
USING (
  session_id IS NULL  -- 세션 없는 이벤트는 조회 불가 (시스템용)
  OR EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = analytics_events.session_id
    AND sessions.user_id = auth.uid()
  )
);

-- INSERT: 클라이언트 직접 삽입 금지 (서버 service_role만 가능)
CREATE POLICY "No client insert on analytics events"
ON analytics_events FOR INSERT
WITH CHECK (false);

-- UPDATE: 감사 로그는 수정 불가
CREATE POLICY "No update on analytics events"
ON analytics_events FOR UPDATE
USING (false) WITH CHECK (false);

-- DELETE: 감사 로그는 삭제 불가
CREATE POLICY "No delete on analytics events"
ON analytics_events FOR DELETE
USING (false);

-- 코멘트
COMMENT ON TABLE analytics_events IS '분석 이벤트 로그. 퍼널/품질 지표용. 불변(immutable), 서버만 삽입 가능';
COMMENT ON COLUMN analytics_events.actor_type IS 'user=자녀, respondent=응답자(토큰), system=시스템, admin=관리자';
COMMENT ON COLUMN analytics_events.event_name IS 'question_generated, answer_received, preview_generated, paragraph_edited 등';

-- ============================================
-- 이벤트 이름 목록 (참고용)
-- ============================================
-- 퍼널 이벤트 (A: 완주율):
--   - first_answer_submitted: 첫 답변 제출
--   - preview_generated: 미리보기 생성
--   - final_generated: 최종 완성
--   - review_status_changed: 검수 상태 변경 (approved_for_pdf, approved_for_print 등)
--
-- 품질 이벤트 (B: 수정률):
--   - message_edited: 메시지 수정
--   - paragraph_edited: 문단 수정
--   - fallback_question_used: Fallback 질문 사용
--
-- Interview OS 이벤트:
--   - question_generated: 질문 생성 (타입, 슬롯, 피로도 포함)
--   - answer_received: 답변 수신 (길이, 짧은 답변 여부)
--   - short_answer_followup: 짧은 답변 자동 후속
