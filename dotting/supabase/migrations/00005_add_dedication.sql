-- =====================================================
-- DOTTING 헤리티지 패키지: 각인(헌정사) 기능 추가
-- 마이그레이션 번호: 00005
-- 설명: orders 테이블에 dedication 컬럼 추가
-- =====================================================

-- orders 테이블에 dedication 컬럼 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dedication TEXT;

-- 코멘트 추가
COMMENT ON COLUMN orders.dedication IS '헤리티지 패키지: 책 속지에 인쇄될 헌정사 (최대 200자)';
