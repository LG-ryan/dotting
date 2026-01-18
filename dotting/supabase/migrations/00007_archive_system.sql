-- Migration: Archive System for Heritage Package
-- 유산 상자(ZIP) 생성 및 관리 시스템

-- 1. orders 테이블에 archive 관련 컬럼 추가
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS archive_url TEXT,
ADD COLUMN IF NOT EXISTS archive_status TEXT CHECK (archive_status IN ('not_started', 'generating', 'ready', 'failed')),
ADD COLUMN IF NOT EXISTS archive_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_progress INTEGER DEFAULT 0 CHECK (archive_progress >= 0 AND archive_progress <= 100),
ADD COLUMN IF NOT EXISTS archive_estimated_seconds INTEGER;

-- 2. archives Storage Bucket 생성 (Supabase Dashboard에서 수동 생성 필요)
-- Bucket name: archives
-- Public: false
-- File size limit: 500MB
-- Allowed MIME types: application/zip

-- 3. Storage Policy 설정
-- 사용자는 자신의 주문에 대한 아카이브만 다운로드 가능

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_archive_status ON orders(archive_status);
CREATE INDEX IF NOT EXISTS idx_orders_archive_url ON orders(archive_url) WHERE archive_url IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN orders.archive_url IS 'Storage path for ZIP archive (Heritage package only)';
COMMENT ON COLUMN orders.archive_status IS 'Archive generation status: not_started, generating, ready, failed';
COMMENT ON COLUMN orders.archive_generated_at IS 'Timestamp when archive was successfully generated';
COMMENT ON COLUMN orders.archive_started_at IS 'Timestamp when archive generation started';
COMMENT ON COLUMN orders.archive_progress IS 'Archive generation progress (0-100%)';
COMMENT ON COLUMN orders.archive_estimated_seconds IS 'Estimated seconds remaining for archive generation';
