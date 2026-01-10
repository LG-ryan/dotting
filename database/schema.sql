-- DOTTING Database Schema
-- Version: 1.1 (Security & Soft Delete Fix)
-- Created: 2026-01-10
-- Updated: 2026-01-10

-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types
-- ============================================
CREATE TYPE session_status AS ENUM ('draft', 'in_progress', 'completed');
CREATE TYPE session_mode AS ENUM ('relaxed', 'dday', 'together');
CREATE TYPE message_role AS ENUM ('ai', 'user');
CREATE TYPE input_type AS ENUM ('text', 'voice');
CREATE TYPE output_status AS ENUM ('draft', 'reviewed', 'finalized', 'locked');
CREATE TYPE editor_type AS ENUM ('child', 'ai');

-- 검수 상태 (비즈니스 플로우)
CREATE TYPE review_status AS ENUM (
  'pending_review',      -- 컴파일 완료, 검토 대기
  'needs_fixes',         -- 자녀가 문제 발견
  'approved_for_edit',   -- 수정 단계 진입 가능
  'approved_for_pdf',    -- PDF 생성 가능
  'approved_for_print',  -- 인쇄 확정
  'printed',             -- 인쇄/배송 완료
  'print_failed'         -- 인쇄 연동 실패
);

-- 상태 변경 주체 타입
CREATE TYPE changed_by_type AS ENUM ('user', 'system', 'admin');

-- ============================================
-- Users (자녀 = 구매자)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Sessions (인터뷰 단위 = 책 1권)
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 인터뷰 대상 정보
  subject_name TEXT NOT NULL,
  subject_relation TEXT NOT NULL,
  
  -- 모드
  mode session_mode DEFAULT 'relaxed',
  mode_config JSONB DEFAULT '{}',
  
  -- 상태
  status session_status DEFAULT 'draft',
  
  -- 공유 토큰 (응답자용 링크)
  share_token TEXT UNIQUE,
  share_token_expires_at TIMESTAMPTZ,
  
  -- Interview OS 상태 (피로도, 목표 슬롯, 짧은 답변 카운트 등)
  interview_state JSONB DEFAULT '{
    "fatigue_score": 0,
    "current_slot": "scene",
    "slot_cycle_count": 0,
    "short_answer_count": 0,
    "last_question_type": null
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions 인덱스
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_share_token ON sessions(share_token);
CREATE INDEX idx_sessions_share_token_expires ON sessions(share_token_expires_at);

-- ============================================
-- Messages (질문/답변)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  role message_role NOT NULL,
  content TEXT NOT NULL,
  input_type input_type DEFAULT 'text',
  audio_url TEXT,
  
  order_index INT NOT NULL,
  
  -- 메타 정보 (AI 질문: question_source 등)
  meta JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- soft delete
);

-- Messages 인덱스
CREATE INDEX idx_messages_session_order ON messages(session_id, order_index);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);
CREATE INDEX idx_messages_active ON messages(session_id) WHERE deleted_at IS NULL;

-- ============================================
-- Context Snapshots (AI 컨텍스트 - 핵심 해자)
-- ============================================
CREATE TABLE context_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- 버전 관리
  version INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  
  -- AI 컨텍스트 데이터
  key_facts JSONB DEFAULT '[]',
  emotional_moments JSONB DEFAULT '[]',
  topics_covered JSONB DEFAULT '[]',
  topics_remaining JSONB DEFAULT '[]',
  next_topic_suggestion TEXT,
  
  -- 어디까지 반영했는지
  last_message_id UUID REFERENCES messages(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()  -- 추가됨
);

-- Context Snapshots 인덱스
CREATE INDEX idx_context_snapshots_session ON context_snapshots(session_id);
CREATE INDEX idx_context_snapshots_current ON context_snapshots(session_id, is_current) WHERE is_current = true;

-- 유니크 제약: 세션당 현재 컨텍스트는 하나만
CREATE UNIQUE INDEX idx_context_snapshots_unique_current 
  ON context_snapshots(session_id) 
  WHERE is_current = true;

-- ============================================
-- Emotional Events (감정 분석 로그)
-- ============================================
CREATE TABLE emotional_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  context_snapshot_id UUID REFERENCES context_snapshots(id) ON DELETE SET NULL,
  
  detected_emotion TEXT NOT NULL,
  confidence FLOAT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotional Events 인덱스
CREATE INDEX idx_emotional_events_session ON emotional_events(session_id);
CREATE INDEX idx_emotional_events_message ON emotional_events(message_id);

-- ============================================
-- Output Drafts (결과물)
-- ============================================
CREATE TABLE output_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  title TEXT,
  status output_status DEFAULT 'draft',
  locked_at TIMESTAMPTZ,  -- 추가됨: status = locked 시점 기록
  
  -- 캐시 유효성 검사용 fingerprint
  fingerprint_message_id UUID,  -- 마지막 메시지 ID
  fingerprint_message_count INTEGER,  -- 메시지 개수
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Output Drafts 인덱스
CREATE INDEX idx_output_drafts_session ON output_drafts(session_id);

-- ============================================
-- Chapters (결과물 챕터)
-- ============================================
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  output_draft_id UUID NOT NULL REFERENCES output_drafts(id) ON DELETE CASCADE,
  
  order_index INT NOT NULL,
  title TEXT,
  content TEXT,
  source_message_ids JSONB DEFAULT '[]',  -- 환각 방지: 원본 메시지 참조
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- soft delete
);

-- Chapters 인덱스
CREATE INDEX idx_chapters_output_order ON chapters(output_draft_id, order_index);
CREATE INDEX idx_chapters_active ON chapters(output_draft_id) WHERE deleted_at IS NULL;

-- ============================================
-- Edit History (수정 이력 - AI 학습 데이터)
-- ============================================
CREATE TABLE edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  
  edited_by editor_type NOT NULL,
  before_content TEXT,
  after_content TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- soft delete
);

-- Edit History 인덱스
CREATE INDEX idx_edit_history_chapter ON edit_history(chapter_id);
CREATE INDEX idx_edit_history_active ON edit_history(chapter_id) WHERE deleted_at IS NULL;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Users: 자기 자신만
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- Sessions RLS (수정됨: share_token 정책 제거)
-- ============================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 소유자만 모든 작업 가능
CREATE POLICY "Users can select own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 주의: share_token으로 직접 조회하는 정책 제거됨
-- 대신 get_session_by_share_token() RPC 함수 사용

-- ============================================
-- Messages RLS (수정됨: soft delete 반영)
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- SELECT: 세션 소유자만, 삭제되지 않은 메시지만
CREATE POLICY "Session owner can read active messages" ON messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- INSERT: 세션 소유자
CREATE POLICY "Session owner can insert messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- UPDATE: 세션 소유자
CREATE POLICY "Session owner can update messages" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- DELETE: 세션 소유자 (soft delete용)
CREATE POLICY "Session owner can delete messages" ON messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- 토큰 보유자가 메시지 삽입 (응답자용) - RPC 함수로 처리
-- 직접 정책 대신 insert_message_by_token() 함수 사용

-- ============================================
-- Context Snapshots RLS
-- ============================================
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owner can select context" ON context_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = context_snapshots.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner can insert context" ON context_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = context_snapshots.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner can update context" ON context_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = context_snapshots.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- Emotional Events RLS
-- ============================================
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owner can manage emotional events" ON emotional_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = emotional_events.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- Output Drafts RLS
-- ============================================
ALTER TABLE output_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owner can manage output" ON output_drafts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = output_drafts.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- Chapters RLS (수정됨: soft delete 반영)
-- ============================================
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- SELECT: 소유자만, 삭제되지 않은 챕터만
CREATE POLICY "Session owner can read active chapters" ON chapters
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM output_drafts 
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE output_drafts.id = chapters.output_draft_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "Session owner can insert chapters" ON chapters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM output_drafts 
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE output_drafts.id = chapters.output_draft_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "Session owner can update chapters" ON chapters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM output_drafts 
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE output_drafts.id = chapters.output_draft_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- DELETE (soft delete용)
CREATE POLICY "Session owner can delete chapters" ON chapters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM output_drafts 
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE output_drafts.id = chapters.output_draft_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- Edit History RLS (수정됨: soft delete 반영)
-- ============================================
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;

-- SELECT: 소유자만, 삭제되지 않은 이력만
CREATE POLICY "Session owner can read active edit history" ON edit_history
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM chapters
      JOIN output_drafts ON output_drafts.id = chapters.output_draft_id
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE chapters.id = edit_history.chapter_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "Session owner can insert edit history" ON edit_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN output_drafts ON output_drafts.id = chapters.output_draft_id
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE chapters.id = edit_history.chapter_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "Session owner can update edit history" ON edit_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN output_drafts ON output_drafts.id = chapters.output_draft_id
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE chapters.id = edit_history.chapter_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- DELETE (soft delete용)
CREATE POLICY "Session owner can delete edit history" ON edit_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chapters
      JOIN output_drafts ON output_drafts.id = chapters.output_draft_id
      JOIN sessions ON sessions.id = output_drafts.session_id
      WHERE chapters.id = edit_history.chapter_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- Functions: Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_context_snapshots_updated_at
  BEFORE UPDATE ON context_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_output_drafts_updated_at
  BEFORE UPDATE ON output_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Functions: Context Snapshot Transaction Helper
-- ============================================
CREATE OR REPLACE FUNCTION create_context_snapshot(
  p_session_id UUID,
  p_key_facts JSONB,
  p_emotional_moments JSONB,
  p_topics_covered JSONB,
  p_topics_remaining JSONB,
  p_next_topic_suggestion TEXT,
  p_last_message_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_version INT;
  v_new_id UUID;
BEGIN
  -- 현재 버전 번호 조회
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM context_snapshots
  WHERE session_id = p_session_id;
  
  -- 기존 current 해제
  UPDATE context_snapshots
  SET is_current = false
  WHERE session_id = p_session_id AND is_current = true;
  
  -- 새 스냅샷 생성
  INSERT INTO context_snapshots (
    session_id,
    version,
    is_current,
    key_facts,
    emotional_moments,
    topics_covered,
    topics_remaining,
    next_topic_suggestion,
    last_message_id
  ) VALUES (
    p_session_id,
    v_new_version,
    true,
    p_key_facts,
    p_emotional_moments,
    p_topics_covered,
    p_topics_remaining,
    p_next_topic_suggestion,
    p_last_message_id
  ) RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- ============================================
-- Functions: Share Token Access (보안 강화)
-- ============================================

-- 공유 토큰으로 세션 조회 (RPC 함수)
CREATE OR REPLACE FUNCTION get_session_by_share_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  subject_name TEXT,
  subject_relation TEXT,
  mode session_mode,
  mode_config JSONB,
  status session_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.subject_name,
    s.subject_relation,
    s.mode,
    s.mode_config,
    s.status
  FROM sessions s
  WHERE s.share_token = p_token
    AND (s.share_token_expires_at IS NULL OR s.share_token_expires_at > NOW());
END;
$$;

-- 공유 토큰으로 메시지 삽입 (응답자용)
CREATE OR REPLACE FUNCTION insert_message_by_token(
  p_token TEXT,
  p_role message_role,
  p_content TEXT,
  p_input_type input_type DEFAULT 'text',
  p_audio_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_order_index INT;
  v_message_id UUID;
BEGIN
  -- 토큰으로 세션 조회
  SELECT id INTO v_session_id
  FROM sessions
  WHERE share_token = p_token
    AND (share_token_expires_at IS NULL OR share_token_expires_at > NOW());
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;
  
  -- 다음 order_index 계산
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_order_index
  FROM messages
  WHERE session_id = v_session_id;
  
  -- 메시지 삽입
  INSERT INTO messages (session_id, role, content, input_type, audio_url, order_index)
  VALUES (v_session_id, p_role, p_content, p_input_type, p_audio_url, v_order_index)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- 공유 토큰으로 메시지 조회 (응답자용)
CREATE OR REPLACE FUNCTION get_messages_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  role message_role,
  content TEXT,
  input_type input_type,
  order_index INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- 토큰으로 세션 조회
  SELECT s.id INTO v_session_id
  FROM sessions s
  WHERE s.share_token = p_token
    AND (s.share_token_expires_at IS NULL OR s.share_token_expires_at > NOW());
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;
  
  RETURN QUERY
  SELECT 
    m.id,
    m.role,
    m.content,
    m.input_type,
    m.order_index,
    m.created_at
  FROM messages m
  WHERE m.session_id = v_session_id
    AND m.deleted_at IS NULL
  ORDER BY m.order_index ASC;
END;
$$;

-- ============================================
-- Functions: Locked At Auto-set
-- ============================================
CREATE OR REPLACE FUNCTION set_locked_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'locked' AND OLD.status != 'locked' THEN
    NEW.locked_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_output_drafts_locked_at
  BEFORE UPDATE ON output_drafts
  FOR EACH ROW EXECUTE FUNCTION set_locked_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE users IS '자녀 계정 (구매자)';
COMMENT ON TABLE sessions IS '인터뷰 단위 = 책 1권';
COMMENT ON TABLE messages IS '질문/답변 기록. soft delete 지원';
COMMENT ON TABLE context_snapshots IS 'AI 컨텍스트 - 핵심 해자. 버전 관리됨';
COMMENT ON TABLE emotional_events IS '감정 분석 로그 - 프롬프트 개선 자산';
COMMENT ON TABLE output_drafts IS '결과물 (초안 → 최종). locked_at으로 확정 시점 기록';
COMMENT ON TABLE chapters IS '결과물 챕터. source_message_ids로 환각 방지. soft delete 지원';
COMMENT ON TABLE edit_history IS '수정 이력 - AI 학습 데이터. soft delete 지원';

COMMENT ON FUNCTION create_context_snapshot IS '트랜잭션 안전한 컨텍스트 스냅샷 생성';
COMMENT ON FUNCTION get_session_by_share_token IS '공유 토큰으로 세션 조회 (보안 강화)';
COMMENT ON FUNCTION insert_message_by_token IS '공유 토큰으로 메시지 삽입 (응답자용)';
COMMENT ON FUNCTION get_messages_by_token IS '공유 토큰으로 메시지 조회 (응답자용)';

-- ============================================
-- Message Edit Logs (답변 수정 감사 로그)
-- ============================================
CREATE TABLE message_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  before_content TEXT NOT NULL,
  after_content TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('edit', 'delete')),
  
  edited_by UUID NOT NULL REFERENCES public.users(id),  -- 자녀(구매자)만 기록, 관리자는 별도 테이블
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_edit_logs_message ON message_edit_logs(message_id);
CREATE INDEX idx_message_edit_logs_session ON message_edit_logs(session_id);
-- 세션 단위 최신 로그 조회 최적화 (분쟁/CS 대응 시 자주 사용)
CREATE INDEX idx_message_edit_logs_session_time ON message_edit_logs(session_id, edited_at DESC);

-- Message Edit Logs RLS
ALTER TABLE message_edit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: 세션 소유자만 조회 가능
CREATE POLICY "Session owner can view message edit logs"
ON message_edit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = message_edit_logs.session_id
    AND sessions.user_id = auth.uid()
  )
);

-- INSERT: 세션 소유자만 삽입 가능
CREATE POLICY "Session owner can insert message edit logs"
ON message_edit_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = message_edit_logs.session_id
    AND sessions.user_id = auth.uid()
  )
);

-- UPDATE: 감사 로그는 수정 불가 (불변성 보장, 이중 차단)
CREATE POLICY "No update on message edit logs"
ON message_edit_logs FOR UPDATE
USING (false)
WITH CHECK (false);

-- DELETE: 감사 로그는 삭제 불가 (불변성 보장)
CREATE POLICY "No delete on message edit logs"
ON message_edit_logs FOR DELETE
USING (false);

COMMENT ON TABLE message_edit_logs IS '답변 수정/삭제 감사 로그 - CS/분쟁 대응용. 불변(immutable) 테이블';

-- ============================================
-- Respondent Message Edit Logs (응답자 수정 로그 - 분리)
-- ============================================
CREATE TABLE respondent_message_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  before_content TEXT NOT NULL,
  after_content TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('edit', 'delete')),
  
  -- 응답자 식별 (토큰 자체는 저장 안 함, HMAC 해시만)
  share_token_hash TEXT NOT NULL,
  
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_respondent_edit_logs_message ON respondent_message_edit_logs(message_id);
CREATE INDEX idx_respondent_edit_logs_session ON respondent_message_edit_logs(session_id);
CREATE INDEX idx_respondent_edit_logs_session_time ON respondent_message_edit_logs(session_id, edited_at DESC);

-- Respondent Message Edit Logs RLS
ALTER TABLE respondent_message_edit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: 세션 소유자(자녀)만 조회 가능
CREATE POLICY "Session owner can view respondent edit logs"
ON respondent_message_edit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = respondent_message_edit_logs.session_id
    AND sessions.user_id = auth.uid()
  )
);

-- INSERT: 직접 INSERT 금지 (RPC만 허용)
-- 응답자는 auth.uid()가 없으므로 직접 접근 불가
-- 오직 SECURITY DEFINER RPC 함수를 통해서만 삽입

-- UPDATE: 감사 로그는 수정 불가
CREATE POLICY "No update on respondent edit logs"
ON respondent_message_edit_logs FOR UPDATE
USING (false)
WITH CHECK (false);

-- DELETE: 감사 로그는 삭제 불가
CREATE POLICY "No delete on respondent edit logs"
ON respondent_message_edit_logs FOR DELETE
USING (false);

COMMENT ON TABLE respondent_message_edit_logs IS '응답자(토큰 사용자) 수정 로그. 자녀 로그와 분리. RPC로만 삽입 가능';

-- ============================================
-- Respondent Edit RPC Functions
-- ============================================

-- 응답자가 마지막 답변 수정 (토큰 기반)
CREATE OR REPLACE FUNCTION edit_last_message_by_token(
  p_token TEXT,
  p_new_content TEXT,
  p_token_secret TEXT  -- 서버에서 전달하는 HMAC 시크릿
)
RETURNS TABLE (
  success BOOLEAN,
  message_id UUID,
  should_regenerate BOOLEAN,  -- 다음 질문 재생성 필요 여부
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_message_id UUID;
  v_before_content TEXT;
  v_token_hash TEXT;
  v_last_user_message_order INT;
  v_max_order INT;
  v_should_regenerate BOOLEAN := false;
BEGIN
  -- 토큰으로 세션 조회
  SELECT s.id INTO v_session_id
  FROM sessions s
  WHERE s.share_token = p_token
    AND (s.share_token_expires_at IS NULL OR s.share_token_expires_at > NOW());
  
  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, false, '유효하지 않거나 만료된 링크입니다.'::TEXT;
    RETURN;
  END IF;
  
  -- 마지막 사용자 메시지 찾기
  SELECT m.id, m.content, m.order_index INTO v_message_id, v_before_content, v_last_user_message_order
  FROM messages m
  WHERE m.session_id = v_session_id
    AND m.role = 'user'
    AND m.deleted_at IS NULL
  ORDER BY m.order_index DESC
  LIMIT 1;
  
  IF v_message_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, false, '수정할 답변이 없습니다.'::TEXT;
    RETURN;
  END IF;
  
  -- 내용이 같으면 수정 불필요
  IF v_before_content = p_new_content THEN
    RETURN QUERY SELECT true, v_message_id, false, NULL::TEXT;
    RETURN;
  END IF;
  
  -- 현재 최대 order_index 확인 (재생성 필요 여부 판단)
  SELECT MAX(order_index) INTO v_max_order
  FROM messages
  WHERE session_id = v_session_id AND deleted_at IS NULL;
  
  -- 마지막 사용자 메시지 바로 다음이 최신이면 재생성 필요
  -- (즉, 사용자 메시지 다음에 AI 질문 1개만 있거나 없는 경우)
  IF v_max_order <= v_last_user_message_order + 1 THEN
    v_should_regenerate := true;
  END IF;
  
  -- 토큰 해시 생성 (HMAC)
  v_token_hash := encode(hmac(p_token, p_token_secret, 'sha256'), 'hex');
  
  -- 메시지 내용 업데이트
  UPDATE messages
  SET content = p_new_content
  WHERE id = v_message_id;
  
  -- 감사 로그 저장
  INSERT INTO respondent_message_edit_logs (
    message_id, session_id, before_content, after_content, edit_type, share_token_hash
  ) VALUES (
    v_message_id, v_session_id, v_before_content, p_new_content, 'edit', v_token_hash
  );
  
  -- 재생성이 필요하고, 다음 AI 메시지가 있으면 soft delete
  IF v_should_regenerate THEN
    UPDATE messages
    SET deleted_at = NOW()
    WHERE session_id = v_session_id
      AND order_index > v_last_user_message_order
      AND deleted_at IS NULL;
  END IF;
  
  RETURN QUERY SELECT true, v_message_id, v_should_regenerate, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION edit_last_message_by_token IS '응답자 마지막 답변 수정. 토큰 기반, HMAC 해시로 로그 저장';

-- ============================================
-- Analytics Events (데이터 자산 - 이벤트 로깅)
-- ============================================
CREATE TABLE analytics_events (
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
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;

-- RLS: 이벤트는 감사 로그 성격 (불변)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE analytics_events IS '분석 이벤트 로그. 퍼널/품질 지표용. 불변(immutable), 서버만 삽입 가능';
COMMENT ON COLUMN analytics_events.actor_type IS 'user=자녀, respondent=응답자(토큰), system=시스템, admin=관리자';
COMMENT ON COLUMN analytics_events.event_name IS 'question_generated, answer_received, preview_generated, paragraph_edited 등';

-- ============================================
-- Episode Theme ENUM (v1.2)
-- ============================================
CREATE TYPE episode_theme AS ENUM (
  'childhood',        -- 어린 시절
  'adolescence',      -- 청소년기
  'early_adulthood',  -- 청년기
  'career',           -- 직업/커리어
  'marriage',         -- 결혼/연애
  'parenting',        -- 자녀 양육
  'turning_point',    -- 인생 전환점
  'hardship',         -- 어려웠던 시기
  'joy',              -- 행복했던 순간
  'reflection',       -- 회고/교훈
  'legacy'            -- 후대에 전하는 말
);

-- ============================================
-- Episode Inclusion Status ENUM
-- ============================================
CREATE TYPE episode_inclusion AS ENUM (
  'candidate',   -- 후보 (아직 판단 전)
  'core',        -- 핵심 (반드시 포함)
  'supporting',  -- 보조 (가능하면 포함)
  'appendix',    -- 부록
  'excluded'     -- 제외
);

-- ============================================
-- Episodes (에피소드 블록 = 책의 최소 단위)
-- ============================================
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- 에피소드 순서 (session 내 유니크)
  order_index INTEGER NOT NULL,
  
  -- 에피소드 정보
  title TEXT,                              -- AI 생성 제목
  theme episode_theme NOT NULL,            -- 주제 (ENUM)
  time_period TEXT,                        -- 시간대 (1970년대, 20대 초반 등)
  
  -- 원본 연결 (추적용) - UUID 배열로 변경됨
  source_message_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- 정제된 콘텐츠
  summary TEXT NOT NULL,                   -- 필수: 1-2문장 요약
  content TEXT,                            -- 정제된 에피소드 본문
  
  -- 편집 판단
  inclusion_status episode_inclusion NOT NULL DEFAULT 'candidate',
  
  -- 서사 밀도 메타
  emotional_weight INTEGER DEFAULT 0 CHECK (emotional_weight >= 0 AND emotional_weight <= 10),
  has_turning_point BOOLEAN DEFAULT FALSE,
  has_reflection BOOLEAN DEFAULT FALSE,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제약 조건
  CONSTRAINT unique_episode_order UNIQUE (session_id, order_index)
);

-- Episodes Indexes
CREATE INDEX idx_episodes_session ON episodes(session_id);
CREATE INDEX idx_episodes_inclusion ON episodes(session_id, inclusion_status);
CREATE INDEX idx_episodes_theme ON episodes(session_id, theme);

-- Episodes RLS
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY episodes_select ON episodes
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY episodes_insert ON episodes
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY episodes_update ON episodes
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

CREATE POLICY episodes_delete ON episodes
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- Episodes Trigger
CREATE TRIGGER trigger_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE episodes IS '에피소드 블록 - 책의 최소 편집 단위';

-- ============================================
-- Compilations (책 버전) - v1.3
-- ============================================
CREATE TABLE compilations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('preview', 'final')),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- 편집 옵션
  preferred_structure TEXT DEFAULT 'freeform',
  chapter_count_min INTEGER DEFAULT 3,
  chapter_count_max INTEGER DEFAULT 5,
  paragraphs_per_chapter_min INTEGER DEFAULT 2,
  paragraphs_per_chapter_max INTEGER DEFAULT 8,
  editor_notes TEXT,
  idempotency_key TEXT,
  
  -- 진행 상태 (비동기 처리용)
  progress JSONB DEFAULT '{"phase": null, "percent": 0, "message": null, "updated_at": null}',
  
  -- 메타 결과 (제목, 서문, 마무리, stats, 모델 버전)
  result_meta JSONB,
  error_message TEXT,
  error_detail JSONB,  -- 실패 시 상세 정보 (재현/개선 루프용)
  
  -- 검수 상태 (비즈니스 플로우, compilation.status와 분리)
  review_status review_status NOT NULL DEFAULT 'pending_review',
  
  -- PDF 스냅샷 (이 버전/시점 기준으로 PDF 생성)
  pdf_snapshot_version INTEGER,
  pdf_snapshot_at TIMESTAMPTZ,
  
  -- PDF 확인 기록 (인쇄 확정 전 필수)
  pdf_confirmed_at TIMESTAMPTZ,
  pdf_confirmed_by UUID REFERENCES public.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT unique_compilation_version UNIQUE (session_id, version),
  CONSTRAINT unique_idempotency UNIQUE (session_id, idempotency_key)
);

-- Compilations 인덱스
CREATE INDEX idx_compilations_session ON compilations(session_id);
CREATE INDEX idx_compilations_session_status ON compilations(session_id, status);

-- ============================================
-- Compilation Episode Inclusions (버전별 에피소드 포함 상태)
-- ============================================
CREATE TABLE compilation_episode_inclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  inclusion_status episode_inclusion NOT NULL,
  decision_reason TEXT,                    -- 선별 사유 (사람이 읽는 문장)
  signals JSONB DEFAULT '{}',              -- 선별 신호 (emotional_weight, redundancy_score 등)
  CONSTRAINT unique_compilation_episode UNIQUE (compilation_id, episode_id)
);

-- ============================================
-- Compiled Chapters (컴파일된 챕터)
-- ============================================
CREATE TABLE compiled_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,  -- gap 방식: 1000, 2000, 3000...
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_chapter_order UNIQUE (compilation_id, order_index)
);

CREATE INDEX idx_compiled_chapters_compilation ON compiled_chapters(compilation_id);

-- ============================================
-- Compiled Paragraphs (문단 = 편집 최소 단위)
-- ============================================
CREATE TABLE compiled_paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES compiled_chapters(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,  -- gap 방식
  content TEXT NOT NULL,
  paragraph_type TEXT NOT NULL DEFAULT 'grounded'
    CHECK (paragraph_type IN ('grounded', 'connector', 'editorial', 'intro', 'outro')),
  revision INTEGER NOT NULL DEFAULT 1,  -- 낙관적 락
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,  -- 숨김 처리 (PDF/인쇄에서 제외)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_paragraph_order UNIQUE (chapter_id, order_index)
);

CREATE INDEX idx_compiled_paragraphs_chapter ON compiled_paragraphs(chapter_id);
CREATE INDEX idx_compiled_paragraphs_type ON compiled_paragraphs(paragraph_type);

-- ============================================
-- Compiled Paragraph Sources (문단별 근거 매핑)
-- ============================================
CREATE TABLE compiled_paragraph_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES compiled_paragraphs(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id),
  message_ids UUID[] NOT NULL DEFAULT '{}',
  CONSTRAINT unique_paragraph_source UNIQUE (paragraph_id, episode_id)
);

CREATE INDEX idx_compiled_paragraph_sources_paragraph ON compiled_paragraph_sources(paragraph_id);
CREATE INDEX idx_compiled_paragraph_sources_episode ON compiled_paragraph_sources(episode_id);

-- ============================================
-- Compiled Paragraph Edits (문단 수정 이력)
-- ============================================
CREATE TABLE compiled_paragraph_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES compiled_paragraphs(id) ON DELETE CASCADE,
  edited_by_type TEXT NOT NULL CHECK (edited_by_type IN ('user', 'ai')),
  edited_by_user_id UUID REFERENCES public.users(id),
  before_content TEXT,
  after_content TEXT,
  edit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compiled_paragraph_edits_paragraph ON compiled_paragraph_edits(paragraph_id);

-- ============================================
-- AI Regen Jobs (AI 재생성 요청)
-- ============================================
CREATE TABLE ai_regen_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  target_chapter_id UUID REFERENCES compiled_chapters(id),
  target_paragraph_id UUID REFERENCES compiled_paragraphs(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  options JSONB DEFAULT '{}',
  result_paragraph_id UUID REFERENCES compiled_paragraphs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT check_single_target CHECK (
    (target_chapter_id IS NOT NULL AND target_paragraph_id IS NULL) OR
    (target_chapter_id IS NULL AND target_paragraph_id IS NOT NULL)
  )
);

CREATE INDEX idx_ai_regen_jobs_compilation ON ai_regen_jobs(compilation_id);
CREATE INDEX idx_ai_regen_jobs_status ON ai_regen_jobs(status);

-- ============================================
-- FINAL 완료 시 grounded 근거 검증 트리거
-- ============================================
CREATE OR REPLACE FUNCTION validate_final_compilation_grounding(p_compilation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_bad_subset_count INTEGER;
  v_missing_grounded_sources_count INTEGER;
  v_empty_message_ids_count INTEGER;
BEGIN
  -- (A) message_ids ⊆ episodes.source_message_ids
  SELECT COUNT(*)
  INTO v_bad_subset_count
  FROM compiled_paragraph_sources s
  JOIN compiled_paragraphs p ON p.id = s.paragraph_id
  JOIN compiled_chapters c ON c.id = p.chapter_id
  JOIN episodes e ON e.id = s.episode_id
  WHERE c.compilation_id = p_compilation_id
    AND NOT (s.message_ids <@ COALESCE(e.source_message_ids, '{}'));

  IF v_bad_subset_count > 0 THEN
    RAISE EXCEPTION
      'Final grounding validation failed: message_ids not subset (count=%).',
      v_bad_subset_count;
  END IF;

  -- (B) grounded 문단: 최소 1개 source row
  SELECT COUNT(*)
  INTO v_missing_grounded_sources_count
  FROM compiled_paragraphs p
  JOIN compiled_chapters c ON c.id = p.chapter_id
  WHERE c.compilation_id = p_compilation_id
    AND p.paragraph_type = 'grounded'
    AND NOT EXISTS (
      SELECT 1 FROM compiled_paragraph_sources s WHERE s.paragraph_id = p.id
    );

  IF v_missing_grounded_sources_count > 0 THEN
    RAISE EXCEPTION
      'Final grounding validation failed: grounded paragraphs missing sources (count=%).',
      v_missing_grounded_sources_count;
  END IF;

  -- (C) grounded source: message_ids 비어있으면 안 됨
  SELECT COUNT(*)
  INTO v_empty_message_ids_count
  FROM compiled_paragraph_sources s
  JOIN compiled_paragraphs p ON p.id = s.paragraph_id
  JOIN compiled_chapters c ON c.id = p.chapter_id
  WHERE c.compilation_id = p_compilation_id
    AND p.paragraph_type = 'grounded'
    AND COALESCE(array_length(s.message_ids, 1), 0) = 0;

  IF v_empty_message_ids_count > 0 THEN
    RAISE EXCEPTION
      'Final grounding validation failed: empty message_ids (count=%).',
      v_empty_message_ids_count;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_compilations_validate_final_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM validate_final_compilation_grounding(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_final_compilation_on_complete
BEFORE UPDATE OF status ON compilations
FOR EACH ROW
WHEN (
  NEW.intent = 'final'
  AND NEW.status = 'completed'
  AND (OLD.status IS DISTINCT FROM NEW.status)
)
EXECUTE FUNCTION trg_compilations_validate_final_on_complete();

-- Compilations 관련 Comments
COMMENT ON TABLE compilations IS '책 컴파일 버전 - preview/final 구분';
COMMENT ON TABLE compilation_episode_inclusions IS '버전별 에피소드 포함 상태';
COMMENT ON TABLE compiled_chapters IS '컴파일된 챕터';
COMMENT ON TABLE compiled_paragraphs IS '문단 = 편집 최소 단위. paragraph_type으로 근거 필수 여부 결정';
COMMENT ON TABLE compiled_paragraph_sources IS '문단별 근거 매핑 (복수 에피소드 허용)';
COMMENT ON TABLE compiled_paragraph_edits IS '문단 수정 이력';
COMMENT ON TABLE ai_regen_jobs IS 'AI 재생성 요청 추적';

-- ============================================
-- Compiled Paragraph Snapshots (PDF용 스냅샷)
-- ============================================
CREATE TABLE compiled_paragraph_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  pdf_snapshot_version INTEGER NOT NULL,
  paragraph_id UUID NOT NULL REFERENCES compiled_paragraphs(id),
  chapter_order_index INTEGER NOT NULL,
  paragraph_order_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  paragraph_type TEXT NOT NULL CHECK (paragraph_type IN ('grounded', 'connector', 'editorial', 'intro', 'outro')),
  is_hidden BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_snapshot_paragraph UNIQUE (compilation_id, pdf_snapshot_version, paragraph_id),
  CONSTRAINT unique_snapshot_layout UNIQUE (compilation_id, pdf_snapshot_version, chapter_order_index, paragraph_order_index)
);

CREATE INDEX idx_paragraph_snapshots_compilation ON compiled_paragraph_snapshots(compilation_id, pdf_snapshot_version);

COMMENT ON TABLE compiled_paragraph_snapshots IS 'PDF 생성용 스냅샷 - 버전별 보관으로 재현/분쟁 대응';

-- ============================================
-- Review Status Logs (검수 상태 변경 이력)
-- ============================================
CREATE TABLE review_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  from_status review_status,
  to_status review_status NOT NULL,
  changed_by UUID REFERENCES public.users(id),  -- 자녀(구매자)만
  changed_by_type changed_by_type NOT NULL,
  reason TEXT,  -- 변경 사유 (선택)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_status_logs_compilation ON review_status_logs(compilation_id);
CREATE INDEX idx_review_status_logs_created ON review_status_logs(created_at);

COMMENT ON TABLE review_status_logs IS '검수 상태 변경 감사 로그 (분쟁/CS 대비)';

-- ============================================
-- printed 최종 방어선 트리거 (DB 레벨 강제)
-- ============================================
CREATE OR REPLACE FUNCTION prevent_printed_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.review_status = 'printed' AND NEW.review_status IS DISTINCT FROM 'printed' THEN
    RAISE EXCEPTION 'Cannot change review_status from printed. This is a final state.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_printed_status_change
BEFORE UPDATE OF review_status ON compilations
FOR EACH ROW
EXECUTE FUNCTION prevent_printed_status_change();
