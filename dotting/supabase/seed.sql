-- =============================================================================
-- DOTTING Seed SQL (로컬/스테이징 전용)
-- =============================================================================
-- 
-- 용도: 로컬 개발 및 스테이징 환경에서만 사용
-- 프로덕션: 이 파일을 직접 실행하지 않음 (런북 참조: docs/runbook-production.md)
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Auth Trigger: 신규 사용자 생성 시 public.users 자동 생성
-- -----------------------------------------------------------------------------
-- 
-- handle_new_user() 함수는 004_orders_payments.sql 마이그레이션에서 생성됨
-- 이 트리거는 auth.users 테이블에 직접 걸어야 하므로 seed에서 별도 설치
--
-- 주의: Supabase 권한 제약으로 인해 auth 스키마 트리거는 
--       대시보드 SQL Editor에서 실행해야 할 수 있음
-- -----------------------------------------------------------------------------

DO $$ 
BEGIN
  -- 기존 트리거 삭제 (idempotent)
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- 트리거 생성
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    
  RAISE NOTICE '[SEED] on_auth_user_created 트리거 설치 완료';
EXCEPTION 
  WHEN insufficient_privilege THEN
    RAISE WARNING '[SEED] auth 스키마 권한 부족 - Supabase 대시보드에서 수동 설치 필요';
  WHEN undefined_function THEN
    RAISE WARNING '[SEED] handle_new_user 함수가 없음 - 004_orders_payments.sql 마이그레이션 먼저 실행';
  WHEN OTHERS THEN
    RAISE WARNING '[SEED] 트리거 설치 실패: % - %', SQLERRM, SQLSTATE;
END $$;

-- -----------------------------------------------------------------------------
-- 2. 트리거 설치 검증 (필수 - 실패 시 배포 중단)
-- -----------------------------------------------------------------------------
-- 
-- 트리거가 없으면 EXCEPTION으로 중단됩니다.
-- 이는 의도된 동작입니다: "설치 안 됨 = 배포 실패"
-- 
-- 만약 권한 문제로 설치가 안 됐다면:
-- 1. Supabase Dashboard > SQL Editor에서 수동 설치
-- 2. 다시 seed 실행
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '[SEED] ✓ 트리거 검증 완료: on_auth_user_created 존재함';
  ELSE
    -- 트리거 미설치 시 배포 중단 (스테이징/CI 품질 보장)
    RAISE EXCEPTION '[SEED] ✗ 트리거 미설치 - 배포 중단. Supabase Dashboard에서 수동 설치 필요.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. 테스트용 Admin 계정 (로컬 개발용, 스테이징/프로덕션에서는 주석 처리)
-- -----------------------------------------------------------------------------
-- 
-- 로컬 테스트 시 아래 주석을 해제하고 실제 auth.users의 id를 입력
--
-- INSERT INTO public.users (id, email, role)
-- VALUES ('YOUR-AUTH-USER-UUID', 'admin@test.local', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- =============================================================================
-- END OF SEED
-- =============================================================================
