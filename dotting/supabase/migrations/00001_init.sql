-- =====================================================
-- DOTTING Database Schema (Initial)
-- 마이그레이션 번호: 00001
-- 설명: 기본 스키마 (users, sessions, messages, episodes, compilations 등)
-- =====================================================
-- 
-- 주의: 이 파일은 SSOT입니다. 직접 수정하지 마세요.
-- 변경이 필요하면 새 마이그레이션 파일을 추가하세요.
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types
-- ============================================
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('draft', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_mode AS ENUM ('relaxed', 'dday', 'together');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_role AS ENUM ('ai', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE input_type AS ENUM ('text', 'voice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE output_status AS ENUM ('draft', 'reviewed', 'finalized', 'locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE editor_type AS ENUM ('child', 'ai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM (
    'pending_review',
    'needs_fixes',
    'approved_for_edit',
    'approved_for_pdf',
    'approved_for_print',
    'printed',
    'print_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE changed_by_type AS ENUM ('user', 'system', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE episode_theme AS ENUM (
    'childhood', 'adolescence', 'early_adulthood', 'career', 'marriage',
    'parenting', 'turning_point', 'hardship', 'joy', 'reflection', 'legacy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE episode_inclusion AS ENUM (
    'candidate', 'core', 'supporting', 'appendix', 'excluded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- Users (자녀 = 구매자)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Sessions (인터뷰 단위 = 책 1권)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_relation TEXT NOT NULL,
  mode session_mode DEFAULT 'relaxed',
  mode_config JSONB DEFAULT '{}',
  status session_status DEFAULT 'draft',
  share_token TEXT UNIQUE,
  share_token_expires_at TIMESTAMPTZ,
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_share_token ON sessions(share_token);
CREATE INDEX IF NOT EXISTS idx_sessions_share_token_expires ON sessions(share_token_expires_at);

-- ============================================
-- Messages (질문/답변)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  input_type input_type DEFAULT 'text',
  audio_url TEXT,
  order_index INT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_session_order ON messages(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_active ON messages(session_id) WHERE deleted_at IS NULL;

-- ============================================
-- Context Snapshots (AI 컨텍스트)
-- ============================================
CREATE TABLE IF NOT EXISTS context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  key_facts JSONB DEFAULT '[]',
  emotional_moments JSONB DEFAULT '[]',
  topics_covered JSONB DEFAULT '[]',
  topics_remaining JSONB DEFAULT '[]',
  next_topic_suggestion TEXT,
  last_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_snapshots_session ON context_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_current ON context_snapshots(session_id, is_current) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_context_snapshots_unique_current ON context_snapshots(session_id) WHERE is_current = true;

-- ============================================
-- Emotional Events
-- ============================================
CREATE TABLE IF NOT EXISTS emotional_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  context_snapshot_id UUID REFERENCES context_snapshots(id) ON DELETE SET NULL,
  detected_emotion TEXT NOT NULL,
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emotional_events_session ON emotional_events(session_id);
CREATE INDEX IF NOT EXISTS idx_emotional_events_message ON emotional_events(message_id);

-- ============================================
-- Output Drafts (결과물)
-- ============================================
CREATE TABLE IF NOT EXISTS output_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT,
  status output_status DEFAULT 'draft',
  locked_at TIMESTAMPTZ,
  fingerprint_message_id UUID,
  fingerprint_message_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_output_drafts_session ON output_drafts(session_id);

-- ============================================
-- Chapters (결과물 챕터)
-- ============================================
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_draft_id UUID NOT NULL REFERENCES output_drafts(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  title TEXT,
  content TEXT,
  source_message_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chapters_output_order ON chapters(output_draft_id, order_index);
CREATE INDEX IF NOT EXISTS idx_chapters_active ON chapters(output_draft_id) WHERE deleted_at IS NULL;

-- ============================================
-- Edit History (수정 이력)
-- ============================================
CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  edited_by editor_type NOT NULL,
  before_content TEXT,
  after_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_edit_history_chapter ON edit_history(chapter_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_active ON edit_history(chapter_id) WHERE deleted_at IS NULL;

-- ============================================
-- Message Edit Logs (답변 수정 감사 로그)
-- ============================================
CREATE TABLE IF NOT EXISTS message_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  before_content TEXT NOT NULL,
  after_content TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('edit', 'delete')),
  edited_by UUID NOT NULL REFERENCES public.users(id),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_edit_logs_message ON message_edit_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_message_edit_logs_session ON message_edit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_message_edit_logs_session_time ON message_edit_logs(session_id, edited_at DESC);

-- ============================================
-- Respondent Message Edit Logs
-- ============================================
CREATE TABLE IF NOT EXISTS respondent_message_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  before_content TEXT NOT NULL,
  after_content TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('edit', 'delete')),
  share_token_hash TEXT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_respondent_edit_logs_message ON respondent_message_edit_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_respondent_edit_logs_session ON respondent_message_edit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_respondent_edit_logs_session_time ON respondent_message_edit_logs(session_id, edited_at DESC);

-- ============================================
-- Analytics Events (데이터 자산)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  respondent_token_hash TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'respondent', 'system', 'admin')),
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- Episodes (에피소드 블록)
-- ============================================
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT,
  theme episode_theme NOT NULL,
  time_period TEXT,
  source_message_ids UUID[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  content TEXT,
  inclusion_status episode_inclusion NOT NULL DEFAULT 'candidate',
  emotional_weight INTEGER DEFAULT 0 CHECK (emotional_weight >= 0 AND emotional_weight <= 10),
  has_turning_point BOOLEAN DEFAULT FALSE,
  has_reflection BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_episode_order UNIQUE (session_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_episodes_session ON episodes(session_id);
CREATE INDEX IF NOT EXISTS idx_episodes_inclusion ON episodes(session_id, inclusion_status);
CREATE INDEX IF NOT EXISTS idx_episodes_theme ON episodes(session_id, theme);

-- ============================================
-- Compilations (책 버전)
-- ============================================
CREATE TABLE IF NOT EXISTS compilations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('preview', 'final')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  preferred_structure TEXT DEFAULT 'freeform',
  chapter_count_min INTEGER DEFAULT 3,
  chapter_count_max INTEGER DEFAULT 5,
  paragraphs_per_chapter_min INTEGER DEFAULT 2,
  paragraphs_per_chapter_max INTEGER DEFAULT 8,
  editor_notes TEXT,
  idempotency_key TEXT,
  progress JSONB DEFAULT '{"phase": null, "percent": 0, "message": null, "updated_at": null}',
  result_meta JSONB,
  error_message TEXT,
  error_detail JSONB,
  review_status review_status NOT NULL DEFAULT 'pending_review',
  pdf_snapshot_version INTEGER,
  pdf_snapshot_at TIMESTAMPTZ,
  pdf_confirmed_at TIMESTAMPTZ,
  pdf_confirmed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_compilation_version UNIQUE (session_id, version),
  CONSTRAINT unique_idempotency UNIQUE (session_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_compilations_session ON compilations(session_id);
CREATE INDEX IF NOT EXISTS idx_compilations_session_status ON compilations(session_id, status);

-- ============================================
-- Compilation Episode Inclusions
-- ============================================
CREATE TABLE IF NOT EXISTS compilation_episode_inclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  inclusion_status episode_inclusion NOT NULL,
  decision_reason TEXT,
  signals JSONB DEFAULT '{}',
  CONSTRAINT unique_compilation_episode UNIQUE (compilation_id, episode_id)
);

-- ============================================
-- Compiled Chapters
-- ============================================
CREATE TABLE IF NOT EXISTS compiled_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_chapter_order UNIQUE (compilation_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_compiled_chapters_compilation ON compiled_chapters(compilation_id);

-- ============================================
-- Compiled Paragraphs
-- ============================================
CREATE TABLE IF NOT EXISTS compiled_paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES compiled_chapters(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  paragraph_type TEXT NOT NULL DEFAULT 'grounded' CHECK (paragraph_type IN ('grounded', 'connector', 'editorial', 'intro', 'outro')),
  revision INTEGER NOT NULL DEFAULT 1,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_paragraph_order UNIQUE (chapter_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_compiled_paragraphs_chapter ON compiled_paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_compiled_paragraphs_type ON compiled_paragraphs(paragraph_type);

-- ============================================
-- Compiled Paragraph Sources
-- ============================================
CREATE TABLE IF NOT EXISTS compiled_paragraph_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES compiled_paragraphs(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id),
  message_ids UUID[] NOT NULL DEFAULT '{}',
  CONSTRAINT unique_paragraph_source UNIQUE (paragraph_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_compiled_paragraph_sources_paragraph ON compiled_paragraph_sources(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_compiled_paragraph_sources_episode ON compiled_paragraph_sources(episode_id);

-- ============================================
-- Compiled Paragraph Edits
-- ============================================
CREATE TABLE IF NOT EXISTS compiled_paragraph_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES compiled_paragraphs(id) ON DELETE CASCADE,
  edited_by_type TEXT NOT NULL CHECK (edited_by_type IN ('user', 'ai')),
  edited_by_user_id UUID REFERENCES public.users(id),
  before_content TEXT,
  after_content TEXT,
  edit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compiled_paragraph_edits_paragraph ON compiled_paragraph_edits(paragraph_id);

-- ============================================
-- AI Regen Jobs
-- ============================================
CREATE TABLE IF NOT EXISTS ai_regen_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  target_chapter_id UUID REFERENCES compiled_chapters(id),
  target_paragraph_id UUID REFERENCES compiled_paragraphs(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  options JSONB DEFAULT '{}',
  result_paragraph_id UUID REFERENCES compiled_paragraphs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT check_single_target CHECK (
    (target_chapter_id IS NOT NULL AND target_paragraph_id IS NULL) OR
    (target_chapter_id IS NULL AND target_paragraph_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_regen_jobs_compilation ON ai_regen_jobs(compilation_id);
CREATE INDEX IF NOT EXISTS idx_ai_regen_jobs_status ON ai_regen_jobs(status);

-- ============================================
-- Compiled Paragraph Snapshots (PDF용)
-- ============================================
CREATE TABLE IF NOT EXISTS compiled_paragraph_snapshots (
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

CREATE INDEX IF NOT EXISTS idx_paragraph_snapshots_compilation ON compiled_paragraph_snapshots(compilation_id, pdf_snapshot_version);

-- ============================================
-- Review Status Logs
-- ============================================
CREATE TABLE IF NOT EXISTS review_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE CASCADE,
  from_status review_status,
  to_status review_status NOT NULL,
  changed_by UUID REFERENCES public.users(id),
  changed_by_type changed_by_type NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_status_logs_compilation ON review_status_logs(compilation_id);
CREATE INDEX IF NOT EXISTS idx_review_status_logs_created ON review_status_logs(created_at);

-- ============================================
-- RLS Policies
-- ============================================

-- Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Sessions RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own sessions" ON sessions;
CREATE POLICY "Users can select own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (auth.uid() = user_id);

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can read active messages" ON messages;
CREATE POLICY "Session owner can read active messages" ON messages FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can insert messages" ON messages;
CREATE POLICY "Session owner can insert messages" ON messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can update messages" ON messages;
CREATE POLICY "Session owner can update messages" ON messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can delete messages" ON messages;
CREATE POLICY "Session owner can delete messages" ON messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

-- Context Snapshots RLS
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can select context" ON context_snapshots;
CREATE POLICY "Session owner can select context" ON context_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = context_snapshots.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can insert context" ON context_snapshots;
CREATE POLICY "Session owner can insert context" ON context_snapshots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = context_snapshots.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can update context" ON context_snapshots;
CREATE POLICY "Session owner can update context" ON context_snapshots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = context_snapshots.session_id AND sessions.user_id = auth.uid()));

-- Emotional Events RLS
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can manage emotional events" ON emotional_events;
CREATE POLICY "Session owner can manage emotional events" ON emotional_events FOR ALL
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = emotional_events.session_id AND sessions.user_id = auth.uid()));

-- Output Drafts RLS
ALTER TABLE output_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can manage output" ON output_drafts;
CREATE POLICY "Session owner can manage output" ON output_drafts FOR ALL
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = output_drafts.session_id AND sessions.user_id = auth.uid()));

-- Chapters RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can read active chapters" ON chapters;
CREATE POLICY "Session owner can read active chapters" ON chapters FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM output_drafts JOIN sessions ON sessions.id = output_drafts.session_id WHERE output_drafts.id = chapters.output_draft_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can insert chapters" ON chapters;
CREATE POLICY "Session owner can insert chapters" ON chapters FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM output_drafts JOIN sessions ON sessions.id = output_drafts.session_id WHERE output_drafts.id = chapters.output_draft_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can update chapters" ON chapters;
CREATE POLICY "Session owner can update chapters" ON chapters FOR UPDATE
  USING (EXISTS (SELECT 1 FROM output_drafts JOIN sessions ON sessions.id = output_drafts.session_id WHERE output_drafts.id = chapters.output_draft_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can delete chapters" ON chapters;
CREATE POLICY "Session owner can delete chapters" ON chapters FOR DELETE
  USING (EXISTS (SELECT 1 FROM output_drafts JOIN sessions ON sessions.id = output_drafts.session_id WHERE output_drafts.id = chapters.output_draft_id AND sessions.user_id = auth.uid()));

-- Edit History RLS
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can read active edit history" ON edit_history;
CREATE POLICY "Session owner can read active edit history" ON edit_history FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM chapters JOIN output_drafts ON output_drafts.id = chapters.output_draft_id JOIN sessions ON sessions.id = output_drafts.session_id WHERE chapters.id = edit_history.chapter_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can insert edit history" ON edit_history;
CREATE POLICY "Session owner can insert edit history" ON edit_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM chapters JOIN output_drafts ON output_drafts.id = chapters.output_draft_id JOIN sessions ON sessions.id = output_drafts.session_id WHERE chapters.id = edit_history.chapter_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can update edit history" ON edit_history;
CREATE POLICY "Session owner can update edit history" ON edit_history FOR UPDATE
  USING (EXISTS (SELECT 1 FROM chapters JOIN output_drafts ON output_drafts.id = chapters.output_draft_id JOIN sessions ON sessions.id = output_drafts.session_id WHERE chapters.id = edit_history.chapter_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can delete edit history" ON edit_history;
CREATE POLICY "Session owner can delete edit history" ON edit_history FOR DELETE
  USING (EXISTS (SELECT 1 FROM chapters JOIN output_drafts ON output_drafts.id = chapters.output_draft_id JOIN sessions ON sessions.id = output_drafts.session_id WHERE chapters.id = edit_history.chapter_id AND sessions.user_id = auth.uid()));

-- Message Edit Logs RLS
ALTER TABLE message_edit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can view message edit logs" ON message_edit_logs;
CREATE POLICY "Session owner can view message edit logs" ON message_edit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = message_edit_logs.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Session owner can insert message edit logs" ON message_edit_logs;
CREATE POLICY "Session owner can insert message edit logs" ON message_edit_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = message_edit_logs.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "No update on message edit logs" ON message_edit_logs;
CREATE POLICY "No update on message edit logs" ON message_edit_logs FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No delete on message edit logs" ON message_edit_logs;
CREATE POLICY "No delete on message edit logs" ON message_edit_logs FOR DELETE USING (false);

-- Respondent Message Edit Logs RLS
ALTER TABLE respondent_message_edit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Session owner can view respondent edit logs" ON respondent_message_edit_logs;
CREATE POLICY "Session owner can view respondent edit logs" ON respondent_message_edit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = respondent_message_edit_logs.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "No update on respondent edit logs" ON respondent_message_edit_logs;
CREATE POLICY "No update on respondent edit logs" ON respondent_message_edit_logs FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No delete on respondent edit logs" ON respondent_message_edit_logs;
CREATE POLICY "No delete on respondent edit logs" ON respondent_message_edit_logs FOR DELETE USING (false);

-- Analytics Events RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own session events" ON analytics_events;
CREATE POLICY "User can view own session events" ON analytics_events FOR SELECT
  USING (session_id IS NULL OR EXISTS (SELECT 1 FROM sessions WHERE sessions.id = analytics_events.session_id AND sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "No client insert on analytics events" ON analytics_events;
CREATE POLICY "No client insert on analytics events" ON analytics_events FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "No update on analytics events" ON analytics_events;
CREATE POLICY "No update on analytics events" ON analytics_events FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No delete on analytics events" ON analytics_events;
CREATE POLICY "No delete on analytics events" ON analytics_events FOR DELETE USING (false);

-- Episodes RLS
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "episodes_select" ON episodes;
CREATE POLICY episodes_select ON episodes FOR SELECT USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "episodes_insert" ON episodes;
CREATE POLICY episodes_insert ON episodes FOR INSERT WITH CHECK (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "episodes_update" ON episodes;
CREATE POLICY episodes_update ON episodes FOR UPDATE USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "episodes_delete" ON episodes;
CREATE POLICY episodes_delete ON episodes FOR DELETE USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

-- ============================================
-- Functions
-- ============================================

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_sessions_updated_at ON sessions;
CREATE TRIGGER trigger_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_context_snapshots_updated_at ON context_snapshots;
CREATE TRIGGER trigger_context_snapshots_updated_at BEFORE UPDATE ON context_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_output_drafts_updated_at ON output_drafts;
CREATE TRIGGER trigger_output_drafts_updated_at BEFORE UPDATE ON output_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_chapters_updated_at ON chapters;
CREATE TRIGGER trigger_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_episodes_updated_at ON episodes;
CREATE TRIGGER trigger_episodes_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Context Snapshot Transaction Helper
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
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version FROM context_snapshots WHERE session_id = p_session_id;
  UPDATE context_snapshots SET is_current = false WHERE session_id = p_session_id AND is_current = true;
  INSERT INTO context_snapshots (session_id, version, is_current, key_facts, emotional_moments, topics_covered, topics_remaining, next_topic_suggestion, last_message_id)
  VALUES (p_session_id, v_new_version, true, p_key_facts, p_emotional_moments, p_topics_covered, p_topics_remaining, p_next_topic_suggestion, p_last_message_id)
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

-- Share Token Functions
CREATE OR REPLACE FUNCTION get_session_by_share_token(p_token TEXT)
RETURNS TABLE (id UUID, subject_name TEXT, subject_relation TEXT, mode session_mode, mode_config JSONB, status session_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.subject_name, s.subject_relation, s.mode, s.mode_config, s.status
  FROM sessions s
  WHERE s.share_token = p_token AND (s.share_token_expires_at IS NULL OR s.share_token_expires_at > NOW());
END;
$$;

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
  SELECT id INTO v_session_id FROM sessions WHERE share_token = p_token AND (share_token_expires_at IS NULL OR share_token_expires_at > NOW());
  IF v_session_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired share token'; END IF;
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_order_index FROM messages WHERE session_id = v_session_id;
  INSERT INTO messages (session_id, role, content, input_type, audio_url, order_index)
  VALUES (v_session_id, p_role, p_content, p_input_type, p_audio_url, v_order_index)
  RETURNING id INTO v_message_id;
  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_messages_by_token(p_token TEXT)
RETURNS TABLE (id UUID, role message_role, content TEXT, input_type input_type, order_index INT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  SELECT s.id INTO v_session_id FROM sessions s WHERE s.share_token = p_token AND (s.share_token_expires_at IS NULL OR s.share_token_expires_at > NOW());
  IF v_session_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired share token'; END IF;
  RETURN QUERY SELECT m.id, m.role, m.content, m.input_type, m.order_index, m.created_at FROM messages m WHERE m.session_id = v_session_id AND m.deleted_at IS NULL ORDER BY m.order_index ASC;
END;
$$;

-- Locked At Auto-set
CREATE OR REPLACE FUNCTION set_locked_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'locked' AND OLD.status != 'locked' THEN
    NEW.locked_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_output_drafts_locked_at ON output_drafts;
CREATE TRIGGER trigger_output_drafts_locked_at BEFORE UPDATE ON output_drafts FOR EACH ROW EXECUTE FUNCTION set_locked_at();

-- Respondent Edit Function
CREATE OR REPLACE FUNCTION edit_last_message_by_token(
  p_token TEXT,
  p_new_content TEXT,
  p_token_secret TEXT
)
RETURNS TABLE (success BOOLEAN, message_id UUID, should_regenerate BOOLEAN, error_message TEXT)
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
  SELECT s.id INTO v_session_id FROM sessions s WHERE s.share_token = p_token AND (s.share_token_expires_at IS NULL OR s.share_token_expires_at > NOW());
  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, false, '유효하지 않거나 만료된 링크입니다.'::TEXT;
    RETURN;
  END IF;

  SELECT m.id, m.content, m.order_index INTO v_message_id, v_before_content, v_last_user_message_order
  FROM messages m WHERE m.session_id = v_session_id AND m.role = 'user' AND m.deleted_at IS NULL ORDER BY m.order_index DESC LIMIT 1;

  IF v_message_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, false, '수정할 답변이 없습니다.'::TEXT;
    RETURN;
  END IF;

  IF v_before_content = p_new_content THEN
    RETURN QUERY SELECT true, v_message_id, false, NULL::TEXT;
    RETURN;
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM messages WHERE session_id = v_session_id AND deleted_at IS NULL;
  IF v_max_order <= v_last_user_message_order + 1 THEN v_should_regenerate := true; END IF;

  v_token_hash := encode(hmac(p_token, p_token_secret, 'sha256'), 'hex');
  UPDATE messages SET content = p_new_content WHERE id = v_message_id;
  INSERT INTO respondent_message_edit_logs (message_id, session_id, before_content, after_content, edit_type, share_token_hash)
  VALUES (v_message_id, v_session_id, v_before_content, p_new_content, 'edit', v_token_hash);

  IF v_should_regenerate THEN
    UPDATE messages SET deleted_at = NOW() WHERE session_id = v_session_id AND order_index > v_last_user_message_order AND deleted_at IS NULL;
  END IF;

  RETURN QUERY SELECT true, v_message_id, v_should_regenerate, NULL::TEXT;
END;
$$;

-- FINAL Validation Trigger
CREATE OR REPLACE FUNCTION validate_final_compilation_grounding(p_compilation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_bad_subset_count INTEGER;
  v_missing_grounded_sources_count INTEGER;
  v_empty_message_ids_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_bad_subset_count
  FROM compiled_paragraph_sources s
  JOIN compiled_paragraphs p ON p.id = s.paragraph_id
  JOIN compiled_chapters c ON c.id = p.chapter_id
  JOIN episodes e ON e.id = s.episode_id
  WHERE c.compilation_id = p_compilation_id AND NOT (s.message_ids <@ COALESCE(e.source_message_ids, '{}'));

  IF v_bad_subset_count > 0 THEN
    RAISE EXCEPTION 'Final grounding validation failed: message_ids not subset (count=%).', v_bad_subset_count;
  END IF;

  SELECT COUNT(*) INTO v_missing_grounded_sources_count
  FROM compiled_paragraphs p JOIN compiled_chapters c ON c.id = p.chapter_id
  WHERE c.compilation_id = p_compilation_id AND p.paragraph_type = 'grounded'
    AND NOT EXISTS (SELECT 1 FROM compiled_paragraph_sources s WHERE s.paragraph_id = p.id);

  IF v_missing_grounded_sources_count > 0 THEN
    RAISE EXCEPTION 'Final grounding validation failed: grounded paragraphs missing sources (count=%).', v_missing_grounded_sources_count;
  END IF;

  SELECT COUNT(*) INTO v_empty_message_ids_count
  FROM compiled_paragraph_sources s
  JOIN compiled_paragraphs p ON p.id = s.paragraph_id
  JOIN compiled_chapters c ON c.id = p.chapter_id
  WHERE c.compilation_id = p_compilation_id AND p.paragraph_type = 'grounded' AND COALESCE(array_length(s.message_ids, 1), 0) = 0;

  IF v_empty_message_ids_count > 0 THEN
    RAISE EXCEPTION 'Final grounding validation failed: empty message_ids (count=%).', v_empty_message_ids_count;
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

DROP TRIGGER IF EXISTS trg_validate_final_compilation_on_complete ON compilations;
CREATE TRIGGER trg_validate_final_compilation_on_complete
  BEFORE UPDATE OF status ON compilations
  FOR EACH ROW
  WHEN (NEW.intent = 'final' AND NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION trg_compilations_validate_final_on_complete();

-- Printed Status Protection
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

DROP TRIGGER IF EXISTS trg_prevent_printed_status_change ON compilations;
CREATE TRIGGER trg_prevent_printed_status_change
  BEFORE UPDATE OF review_status ON compilations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_printed_status_change();

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
COMMENT ON TABLE message_edit_logs IS '답변 수정/삭제 감사 로그 - CS/분쟁 대응용. 불변(immutable) 테이블';
COMMENT ON TABLE respondent_message_edit_logs IS '응답자(토큰 사용자) 수정 로그. 자녀 로그와 분리. RPC로만 삽입 가능';
COMMENT ON TABLE analytics_events IS '분석 이벤트 로그. 퍼널/품질 지표용. 불변(immutable), 서버만 삽입 가능';
COMMENT ON TABLE episodes IS '에피소드 블록 - 책의 최소 편집 단위';
COMMENT ON TABLE compilations IS '책 컴파일 버전 - preview/final 구분';
COMMENT ON TABLE compilation_episode_inclusions IS '버전별 에피소드 포함 상태';
COMMENT ON TABLE compiled_chapters IS '컴파일된 챕터';
COMMENT ON TABLE compiled_paragraphs IS '문단 = 편집 최소 단위. paragraph_type으로 근거 필수 여부 결정';
COMMENT ON TABLE compiled_paragraph_sources IS '문단별 근거 매핑 (복수 에피소드 허용)';
COMMENT ON TABLE compiled_paragraph_edits IS '문단 수정 이력';
COMMENT ON TABLE ai_regen_jobs IS 'AI 재생성 요청 추적';
COMMENT ON TABLE compiled_paragraph_snapshots IS 'PDF 생성용 스냅샷 - 버전별 보관으로 재현/분쟁 대응';
COMMENT ON TABLE review_status_logs IS '검수 상태 변경 감사 로그 (분쟁/CS 대비)';
