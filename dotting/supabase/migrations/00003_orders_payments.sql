-- =====================================================
-- DOTTING 주문/결제 시스템 마이그레이션
-- 마이그레이션 번호: 00003
-- 설명: PRD v3.2 선결제 모델 + 끝까지 책임
-- =====================================================
-- 
-- 주의: 이 파일은 SSOT입니다. 직접 수정하지 마세요.
-- 변경이 필요하면 새 마이그레이션 파일을 추가하세요.
-- Idempotent: 재실행 안전
-- =====================================================

-- 1. 패키지 타입 ENUM
DO $$ BEGIN
  CREATE TYPE package_type AS ENUM ('pdf_only', 'standard', 'premium');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. 주문 상태 ENUM
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'paid',
    'in_production',
    'ready_to_ship',
    'shipped',
    'delivered',
    'completed',
    'refunded',
    'cancelled',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. 결제 방식 ENUM
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('manual', 'toss', 'kakao', 'card');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. 클레임 상태 ENUM
DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('opened', 'in_review', 'resolved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. 클레임 유형 ENUM
DO $$ BEGIN
  CREATE TYPE claim_type AS ENUM ('print_defect', 'shipping_damage', 'wrong_delivery', 'content_error', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- orders 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  package package_type NOT NULL,
  amount INTEGER NOT NULL,
  status order_status NOT NULL DEFAULT 'pending_payment',
  payment_method payment_method,
  payment_note TEXT,
  payment_requested_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  progress JSONB DEFAULT '{}',
  recipient_name TEXT,
  shipping_address TEXT,
  shipping_phone TEXT,
  tracking_carrier TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refund_amount INTEGER,
  refund_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_per_session 
  ON orders (session_id) 
  WHERE is_active = true AND status NOT IN ('completed', 'cancelled', 'refunded', 'expired');

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- =====================================================
-- order_status_logs 테이블 (불변)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_status_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created ON order_status_logs(created_at DESC);

-- =====================================================
-- claims 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type claim_type NOT NULL,
  status claim_status NOT NULL DEFAULT 'opened',
  description TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  compensation_type TEXT,
  compensation_amount INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_order ON claims(order_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

-- =====================================================
-- claim_logs 테이블 (불변)
-- =====================================================
CREATE TABLE IF NOT EXISTS claim_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  from_status claim_status,
  to_status claim_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_logs_claim ON claim_logs(claim_id);

-- =====================================================
-- RLS 정책
-- =====================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_logs ENABLE ROW LEVEL SECURITY;

-- orders 정책
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator')));

-- order_status_logs 정책
DROP POLICY IF EXISTS "Users can view own order logs" ON order_status_logs;
CREATE POLICY "Users can view own order logs" ON order_status_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_logs.order_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert order logs" ON order_status_logs;
CREATE POLICY "Admins can insert order logs" ON order_status_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator')));

DROP POLICY IF EXISTS "Admins can view all order logs" ON order_status_logs;
CREATE POLICY "Admins can view all order logs" ON order_status_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator')));

-- claims 정책
DROP POLICY IF EXISTS "Users can view own claims" ON claims;
CREATE POLICY "Users can view own claims" ON claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = claims.order_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create claims" ON claims;
CREATE POLICY "Users can create claims" ON claims FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = claims.order_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all claims" ON claims;
CREATE POLICY "Admins can manage all claims" ON claims FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator')));

-- claim_logs 정책
DROP POLICY IF EXISTS "Users can view own claim logs" ON claim_logs;
CREATE POLICY "Users can view own claim logs" ON claim_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM claims JOIN orders ON orders.id = claims.order_id WHERE claims.id = claim_logs.claim_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert claim logs" ON claim_logs;
CREATE POLICY "Admins can insert claim logs" ON claim_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator')));

DROP POLICY IF EXISTS "Admins can view all claim logs" ON claim_logs;
CREATE POLICY "Admins can view all claim logs" ON claim_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator')));

-- =====================================================
-- 트리거: updated_at 자동 갱신
-- =====================================================

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS claims_updated_at ON claims;
CREATE TRIGGER claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 주문 상태 전이 함수
-- =====================================================

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id UUID,
  p_new_status order_status,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS orders AS $$
DECLARE
  v_order orders;
  v_old_status order_status;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found: %', p_order_id; END IF;
  
  v_old_status := v_order.status;
  IF NOT is_valid_order_transition(v_old_status, p_new_status) THEN
    RAISE EXCEPTION 'Invalid transition from % to %', v_old_status, p_new_status;
  END IF;
  
  UPDATE orders SET 
    status = p_new_status,
    paid_at = CASE WHEN p_new_status = 'paid' THEN now() ELSE paid_at END,
    shipped_at = CASE WHEN p_new_status = 'shipped' THEN now() ELSE shipped_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN now() ELSE delivered_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE completed_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END,
    refunded_at = CASE WHEN p_new_status = 'refunded' THEN now() ELSE refunded_at END,
    is_active = CASE WHEN p_new_status IN ('completed', 'cancelled', 'refunded', 'expired') THEN false ELSE is_active END
  WHERE id = p_order_id
  RETURNING * INTO v_order;
  
  INSERT INTO order_status_logs (order_id, from_status, to_status, changed_by, reason, metadata)
  VALUES (p_order_id, v_old_status, p_new_status, auth.uid(), p_reason, p_metadata);
  
  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 상태 전이 유효성 검사 함수
-- =====================================================

CREATE OR REPLACE FUNCTION is_valid_order_transition(p_from order_status, p_to order_status)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE
    WHEN p_from = 'pending_payment' AND p_to IN ('paid', 'cancelled', 'expired') THEN true
    WHEN p_from = 'paid' AND p_to IN ('in_production', 'refunded') THEN true
    WHEN p_from = 'in_production' AND p_to IN ('ready_to_ship', 'refunded') THEN true
    WHEN p_from = 'ready_to_ship' AND p_to = 'shipped' THEN true
    WHEN p_from = 'shipped' AND p_to IN ('delivered') THEN true
    WHEN p_from = 'delivered' AND p_to = 'completed' THEN true
    WHEN p_from = 'expired' AND p_to = 'pending_payment' THEN true
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 결제 게이트 함수
-- =====================================================

CREATE OR REPLACE FUNCTION check_payment_gate(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_order orders;
BEGIN
  SELECT * INTO v_order FROM orders
  WHERE session_id = p_session_id AND is_active = true
    AND status NOT IN ('completed', 'cancelled', 'refunded', 'expired')
  ORDER BY created_at DESC LIMIT 1;
  
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN v_order.status IN ('paid', 'in_production', 'ready_to_ship', 'shipped', 'delivered');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 고객용: 내 활성 주문 조회
-- =====================================================

CREATE OR REPLACE FUNCTION get_my_active_order(p_session_id UUID)
RETURNS orders AS $$
BEGIN
  RETURN (
    SELECT * FROM orders
    WHERE session_id = p_session_id AND user_id = auth.uid() AND is_active = true
      AND status NOT IN ('completed', 'cancelled', 'refunded', 'expired')
    ORDER BY created_at DESC LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 신규 사용자 자동 생성 함수
-- (트리거는 seed.sql 또는 수동 설치)
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE orders IS '주문 테이블 - PRD v3.2 선결제 모델';
COMMENT ON TABLE order_status_logs IS '주문 상태 변경 로그 - 불변(immutable)';
COMMENT ON TABLE claims IS '클레임/티켓 테이블 - 주문과 별도 관리';
COMMENT ON TABLE claim_logs IS '클레임 상태 변경 로그 - 불변(immutable)';
COMMENT ON FUNCTION check_payment_gate IS '결제 게이트: paid 이상 상태만 LLM 비용 허용';
COMMENT ON FUNCTION handle_new_user IS 'auth.users INSERT 시 public.users 자동 생성 (트리거 필요)';
