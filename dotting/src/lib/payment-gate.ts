/**
 * Payment Gate - LLM 비용 발생 전 결제 확인
 * PRD v3.2: 선결제 모델 + API 비용 누수 0원
 */

import { createClient } from '@/lib/supabase/server';
import { OrderStatus } from '@/types/database';

// 결제 완료 상태 (LLM 비용 발생 허용)
const PAID_STATUSES: OrderStatus[] = [
  'paid',
  'in_production',
  'ready_to_ship',
  'shipped',
  'delivered',
  'completed',
];

export interface PaymentGateResult {
  allowed: boolean;
  status: OrderStatus | null;
  orderId: string | null;
  message: string;
}

/**
 * 세션(프로젝트)의 결제 상태 확인
 * LLM 비용이 발생하는 모든 API에서 먼저 호출
 * 
 * @param sessionId - 세션 ID
 * @param supabaseClient - 선택적 Supabase 클라이언트 (응답자 API용 service_role)
 */
export async function checkPaymentGate(
  sessionId: string,
  supabaseClient?: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<PaymentGateResult> {
  const supabase = supabaseClient || await createClient();

  // 활성 주문 조회
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .not('status', 'in', '("completed","cancelled","refunded","expired")')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !order) {
    return {
      allowed: false,
      status: null,
      orderId: null,
      message: '결제가 필요합니다. 인터뷰를 시작하려면 먼저 결제를 완료해주세요.',
    };
  }

  const orderStatus = order.status as OrderStatus;

  if (PAID_STATUSES.includes(orderStatus)) {
    return {
      allowed: true,
      status: orderStatus,
      orderId: order.id,
      message: '결제가 확인되었습니다.',
    };
  }

  // 결제 대기 상태별 메시지
  const statusMessages: Record<string, string> = {
    pending_payment: '결제를 완료해주세요. 결제 확인 후 인터뷰를 시작할 수 있습니다.',
    expired: '결제 기한이 만료되었습니다. 다시 결제를 진행해주세요.',
  };

  return {
    allowed: false,
    status: orderStatus,
    orderId: order.id,
    message: statusMessages[orderStatus] || '결제 상태를 확인해주세요.',
  };
}

/**
 * 결제 게이트 미들웨어 (API Route에서 사용)
 * 결제가 필요하면 403 응답
 * 
 * @param sessionId - 세션 ID
 * @param supabaseClient - 선택적 Supabase 클라이언트 (응답자 API용 service_role)
 */
export async function requirePayment(
  sessionId: string,
  supabaseClient?: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  const result = await checkPaymentGate(sessionId, supabaseClient);

  if (result.allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    response: new Response(
      JSON.stringify({
        error: 'PAYMENT_REQUIRED',
        message: result.message,
        status: result.status,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    ),
  };
}

/**
 * 주문 생성 (결제 요청)
 */
export async function createOrder(params: {
  userId: string;
  sessionId: string;
  packageType: 'pdf_only' | 'standard' | 'premium';
  amount: number;
}) {
  const supabase = await createClient();

  // 기존 활성 주문 확인
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, status')
    .eq('session_id', params.sessionId)
    .eq('is_active', true)
    .not('status', 'in', '("completed","cancelled","refunded","expired")')
    .single();

  if (existingOrder) {
    return {
      success: false,
      error: 'ACTIVE_ORDER_EXISTS',
      message: '이미 진행 중인 주문이 있습니다.',
      orderId: existingOrder.id,
    };
  }

  // 주문 생성
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      session_id: params.sessionId,
      package: params.packageType,
      amount: params.amount,
      status: 'pending_payment',
      payment_method: 'manual',
      payment_requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: 'CREATE_FAILED',
      message: '주문 생성에 실패했습니다.',
    };
  }

  return {
    success: true,
    orderId: order.id,
    status: order.status,
  };
}

// 패키지 상수는 @/lib/payment-constants에서 import하세요 (클라이언트/서버 공용)
// 이 파일은 서버 전용입니다. 클라이언트에서 상수가 필요하면 payment-constants.ts 사용
