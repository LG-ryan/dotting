-- =====================================================
-- DOTTING 스테이징 완전 설정 SQL
-- =====================================================
-- Supabase Dashboard > SQL Editor에서 순서대로 실행하세요
-- =====================================================

-- =====================================================
-- STEP 1: 마이그레이션 00004 적용 (RPC 함수)
-- =====================================================
-- 00004_user_sync_rpc.sql 내용을 여기 붙여넣고 실행
-- 또는 CLI: supabase db push

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
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT au.email, COALESCE(au.raw_user_meta_data->>'name', au.email)
  INTO v_email, v_name
  FROM auth.users au
  WHERE au.id = v_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  INSERT INTO public.users (id, email, name, role)
  VALUES (v_user_id, v_email, v_name, 'user')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_email);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION sync_user_profile IS 'RPC: 현재 사용자의 public.users 프로필 동기화 (트리거 백업)';

-- =====================================================
-- STEP 2: 트리거 확인 및 설치
-- =====================================================

-- 2-1. 함수 존재 확인
SELECT 
  proname AS function_name,
  prosecdef AS is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';
-- 결과: handle_new_user | t (true)

-- 2-2. 트리거 존재 확인
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
-- 결과가 없으면 아래 2-3 실행

-- 2-3. 트리거 설치 (위에서 결과가 없었다면 실행)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2-4. 설치 확인 (다시 실행)
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
-- 결과: on_auth_user_created | auth.users | O

-- =====================================================
-- STEP 3: 기존 사용자 동기화
-- =====================================================

-- 3-1. 동기화 필요한 사용자 확인
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 3-2. 동기화 실행
INSERT INTO public.users (id, email, name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  'user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3-3. 동기화 결과 확인
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.users) AS public_users_count,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) AS missing_count;
-- 결과: missing_count가 0이어야 함

-- =====================================================
-- STEP 4: 최종 검증
-- =====================================================

-- 4-1. RPC 함수 테스트 (현재 로그인한 사용자로)
-- Supabase Dashboard에서는 테스트 불가 (auth.uid() 필요)
-- 앱에서 자동으로 호출됨

-- 4-2. 모든 설정 확인
SELECT 
  'sync_user_profile function' AS component,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_user_profile') 
    THEN '✓ Installed' ELSE '✗ Missing' END AS status
UNION ALL
SELECT 
  'handle_new_user function',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN '✓ Installed' ELSE '✗ Missing' END
UNION ALL
SELECT 
  'on_auth_user_created trigger',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
    THEN '✓ Installed' ELSE '✗ Missing' END
UNION ALL
SELECT 
  'User sync status',
  CASE WHEN (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) = 0
    THEN '✓ All synced' ELSE '✗ Sync needed' END;

-- 모든 항목이 ✓ 이어야 함

-- =====================================================
-- 완료!
-- =====================================================
-- 이제 브라우저를 새로고침하면 정상 작동합니다.
