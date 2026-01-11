-- =====================================================
-- DOTTING Print Orders Migration
-- 마이그레이션 번호: 00002
-- 설명: User roles + Print orders 테이블 (배송/클레임 관리)
-- =====================================================
-- 
-- 주의: 이 파일은 SSOT입니다. 직접 수정하지 마세요.
-- 변경이 필요하면 새 마이그레이션 파일을 추가하세요.
-- =====================================================

-- =============================================
-- 1. USER ROLE ENUM & COLUMN
-- =============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'operator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================
-- 2. PRINT ORDER STATUS ENUM
-- =============================================

DO $$ BEGIN
  CREATE TYPE print_order_status AS ENUM (
    'pending',
    'printing',
    'shipped',
    'delivered',
    'claim_opened',
    'claim_resolved'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 3. PRINT_ORDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compilation_id UUID NOT NULL REFERENCES compilations(id) ON DELETE RESTRICT,
  status print_order_status DEFAULT 'pending' NOT NULL,
  
  -- 배송 정보
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_address_detail TEXT,
  postal_code TEXT NOT NULL,
  
  -- 송장 정보
  tracking_carrier TEXT,
  tracking_number TEXT,
  
  -- 클레임 정보
  claim_reason TEXT,
  claim_resolution TEXT,
  
  -- 관리 정보
  admin_note TEXT,
  processed_by UUID REFERENCES users(id),
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  claim_opened_at TIMESTAMPTZ,
  claim_resolved_at TIMESTAMPTZ,
  
  -- 제약조건
  CONSTRAINT chk_shipped_tracking CHECK (status != 'shipped' OR tracking_number IS NOT NULL),
  CONSTRAINT chk_delivered_after_shipped CHECK (delivered_at IS NULL OR shipped_at IS NOT NULL),
  CONSTRAINT chk_claim_resolved_after_opened CHECK (claim_resolved_at IS NULL OR claim_opened_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_print_orders_compilation_id ON print_orders(compilation_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_status ON print_orders(status);
CREATE INDEX IF NOT EXISTS idx_print_orders_created_at ON print_orders(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_print_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_print_orders_updated_at ON print_orders;
CREATE TRIGGER trigger_print_orders_updated_at
  BEFORE UPDATE ON print_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_print_orders_updated_at();

-- =============================================
-- 4. PRINT_ORDER_LOGS TABLE (상태 전이 로그)
-- =============================================

CREATE TABLE IF NOT EXISTS print_order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_order_id UUID NOT NULL REFERENCES print_orders(id) ON DELETE CASCADE,
  from_status print_order_status,
  to_status print_order_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_print_order_logs_order_id ON print_order_logs(print_order_id);

-- =============================================
-- 5. RLS POLICIES
-- =============================================

ALTER TABLE print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_order_logs ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
DROP POLICY IF EXISTS "Admins can manage print_orders" ON print_orders;
CREATE POLICY "Admins can manage print_orders"
  ON print_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operator')
    )
  );

-- Users can view their own orders
DROP POLICY IF EXISTS "Users can view own print_orders" ON print_orders;
CREATE POLICY "Users can view own print_orders"
  ON print_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM compilations c
      JOIN sessions s ON c.session_id = s.id
      WHERE c.id = print_orders.compilation_id
      AND s.user_id = auth.uid()
    )
  );

-- Admin can manage logs
DROP POLICY IF EXISTS "Admins can manage print_order_logs" ON print_order_logs;
CREATE POLICY "Admins can manage print_order_logs"
  ON print_order_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operator')
    )
  );

-- Users can view logs for their orders
DROP POLICY IF EXISTS "Users can view own print_order_logs" ON print_order_logs;
CREATE POLICY "Users can view own print_order_logs"
  ON print_order_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM print_orders po
      JOIN compilations c ON po.compilation_id = c.id
      JOIN sessions s ON c.session_id = s.id
      WHERE po.id = print_order_logs.print_order_id
      AND s.user_id = auth.uid()
    )
  );

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'operator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE print_orders IS '인쇄 주문 관리 테이블 - 배송/클레임 상태 추적';
COMMENT ON COLUMN print_orders.status IS '주문 상태: pending→printing→shipped→delivered 또는 claim_opened→claim_resolved';
COMMENT ON COLUMN print_orders.tracking_carrier IS '택배사 코드 (cj, hanjin, lotte, post 등)';
COMMENT ON TABLE print_order_logs IS '인쇄 주문 상태 변경 로그 - 감사/분쟁 대응용';
