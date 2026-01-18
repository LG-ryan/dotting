-- ============================================================
-- DOTTING v1.3: 오디오 플레이리스트 시스템
-- "간직할 순간" QR 코드 및 웹 플레이어 기반
-- ============================================================

-- 오디오 플레이리스트 테이블
CREATE TABLE IF NOT EXISTS audio_playlists (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- QR 코드용 공유 토큰 (32자 hex)
  share_token TEXT NOT NULL UNIQUE,
  
  -- 간직할 순간 메시지 ID 배열 (순서 보장)
  moment_message_ids UUID[] NOT NULL,
  
  -- 메타데이터 (캐싱용)
  speaker_name TEXT NOT NULL,
  package_type package_type NOT NULL,
  
  -- 통계
  play_count INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  
  -- 만료 정책
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = 영구 (Heritage)
  
  -- 제약조건
  CONSTRAINT moment_message_ids_not_empty CHECK (array_length(moment_message_ids, 1) > 0)
);

-- 인덱스
CREATE INDEX idx_audio_playlists_share_token ON audio_playlists(share_token);
CREATE INDEX idx_audio_playlists_session_id ON audio_playlists(session_id);
CREATE INDEX idx_audio_playlists_expires_at ON audio_playlists(expires_at) WHERE expires_at IS NOT NULL;

-- RLS 정책: 토큰만 있으면 누구나 읽기 가능 (익명 접근)
ALTER TABLE audio_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read with valid token"
  ON audio_playlists FOR SELECT
  USING (true);

-- 생성은 인증된 사용자만 (서버 API에서 호출)
CREATE POLICY "Authenticated users can create"
  ON audio_playlists FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 재생 횟수 업데이트는 누구나 가능 (익명 포함)
CREATE POLICY "Anyone can update play stats"
  ON audio_playlists FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 헬퍼 함수: 플레이리스트 생성
-- ============================================================

CREATE OR REPLACE FUNCTION create_audio_playlist(
  p_session_id UUID,
  p_moment_message_ids UUID[],
  p_speaker_name TEXT,
  p_package_type package_type,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  share_token TEXT
) AS $$
DECLARE
  v_token TEXT;
  v_playlist_id UUID;
BEGIN
  -- 32자 hex 토큰 생성 (16 bytes)
  v_token := encode(gen_random_bytes(16), 'hex');
  
  -- 플레이리스트 생성
  INSERT INTO audio_playlists (
    session_id,
    share_token,
    moment_message_ids,
    speaker_name,
    package_type,
    expires_at
  ) VALUES (
    p_session_id,
    v_token,
    p_moment_message_ids,
    p_speaker_name,
    p_package_type,
    p_expires_at
  )
  RETURNING audio_playlists.id INTO v_playlist_id;
  
  -- 결과 반환
  RETURN QUERY SELECT v_playlist_id, v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 헬퍼 함수: 재생 횟수 증가
-- ============================================================

CREATE OR REPLACE FUNCTION increment_playlist_play_count(
  p_share_token TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE audio_playlists
  SET 
    play_count = play_count + 1,
    last_played_at = NOW()
  WHERE share_token = p_share_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 코멘트
-- ============================================================

COMMENT ON TABLE audio_playlists IS 'QR 코드 기반 오디오 플레이리스트 (간직할 순간)';
COMMENT ON COLUMN audio_playlists.share_token IS 'QR 코드에 인코딩되는 32자 익명 토큰';
COMMENT ON COLUMN audio_playlists.moment_message_ids IS '간직할 순간 메시지 ID 배열 (순서 보장)';
COMMENT ON COLUMN audio_playlists.expires_at IS 'NULL = 영구 (Heritage), NOT NULL = 만료 기간 (Story)';
