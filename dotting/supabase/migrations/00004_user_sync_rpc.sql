-- =====================================================
-- DOTTING Database Schema
-- 마이그레이션 번호: 00004
-- 설명: 사용자 프로필 동기화 RPC 함수 (트리거 백업)
-- =====================================================
-- 
-- 목적: auth.users와 public.users 동기화 보장
-- - 주 메커니즘: handle_new_user 트리거 (00003에서 정의)
-- - 백업 메커니즘: sync_user_profile RPC (이 파일)
-- 
-- 사용 시나리오:
-- 1. 트리거가 정상 작동하면 이 함수는 호출되지 않음
-- 2. 트리거 미설치/실패 시 클라이언트에서 호출
-- 3. 기존 사용자 수동 동기화 시 사용
-- =====================================================

-- =====================================================
-- RPC 함수: 현재 로그인한 사용자의 프로필 동기화
-- =====================================================
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_name TEXT;
  v_result jsonb;
BEGIN
  -- 현재 로그인한 사용자 ID 가져오기
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- auth.users에서 정보 가져오기
  SELECT 
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email)
  INTO v_email, v_name
  FROM auth.users au
  WHERE au.id = v_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users'
    );
  END IF;

  -- public.users에 upsert
  INSERT INTO public.users (id, email, name, role)
  VALUES (v_user_id, v_email, v_name, 'user')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION sync_user_profile IS 'RPC: 현재 사용자의 public.users 프로필 동기화 (트리거 백업)';
