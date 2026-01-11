import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types/database'

/**
 * 유효한 상태 전이 규칙
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled', 'expired'],
  paid: ['in_production', 'refunded'],
  in_production: ['ready_to_ship', 'refunded'],
  ready_to_ship: ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  refunded: [],
  cancelled: [],
  expired: ['pending_payment'], // 재시도 허용
}

/**
 * PATCH /api/admin/orders/[id]/status
 * 관리자용 주문 상태 전이
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = await createClient()
  
  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 관리자 권한 확인
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!userData || !['admin', 'operator'].includes(userData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 요청 바디 파싱
  const body = await request.json()
  const { 
    toStatus, 
    reason,
    tracking_carrier,
    tracking_number,
    admin_note,
    refund_amount,
    refund_reason,
  } = body as {
    toStatus: OrderStatus
    reason?: string
    tracking_carrier?: string
    tracking_number?: string
    admin_note?: string
    refund_amount?: number
    refund_reason?: string
  }
  
  if (!toStatus) {
    return NextResponse.json({ error: 'toStatus is required' }, { status: 400 })
  }
  
  // 현재 주문 조회
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  
  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  
  const fromStatus = order.status as OrderStatus
  
  // 상태 전이 유효성 검사
  if (!VALID_TRANSITIONS[fromStatus]?.includes(toStatus)) {
    return NextResponse.json({ 
      error: `Invalid transition from ${fromStatus} to ${toStatus}` 
    }, { status: 400 })
  }
  
  // 필수 입력 검증
  if (toStatus === 'shipped' && (!tracking_carrier || !tracking_number)) {
    return NextResponse.json({ 
      error: '배송 완료 처리 시 택배사와 송장번호가 필요합니다' 
    }, { status: 400 })
  }
  
  if (toStatus === 'refunded' && !refund_reason) {
    return NextResponse.json({ 
      error: '환불 처리 시 환불 사유가 필요합니다' 
    }, { status: 400 })
  }
  
  // 상태별 업데이트 데이터
  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = {
    status: toStatus,
  }
  
  // 상태별 타임스탬프/데이터 설정
  switch (toStatus) {
    case 'paid':
      updateData.paid_at = now
      break
    case 'shipped':
      updateData.shipped_at = now
      updateData.tracking_carrier = tracking_carrier
      updateData.tracking_number = tracking_number
      if (admin_note) updateData.admin_note = admin_note
      break
    case 'delivered':
      updateData.delivered_at = now
      break
    case 'completed':
      updateData.completed_at = now
      updateData.is_active = false
      break
    case 'cancelled':
      updateData.cancelled_at = now
      updateData.cancel_reason = reason
      updateData.is_active = false
      break
    case 'refunded':
      updateData.refunded_at = now
      updateData.refund_amount = refund_amount || order.amount
      updateData.refund_reason = refund_reason
      updateData.is_active = false
      break
    case 'expired':
      updateData.is_active = false
      break
  }
  
  // 주문 상태 업데이트
  const { error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
  
  if (updateError) {
    console.error('Error updating order:', updateError)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
  
  // 상태 변경 로그 기록
  const { error: logError } = await supabase
    .from('order_status_logs')
    .insert({
      order_id: orderId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: user.id,
      reason: reason || null,
      metadata: {
        tracking_carrier,
        tracking_number,
        admin_note,
        refund_amount,
        refund_reason,
      },
    })
  
  if (logError) {
    console.error('Error creating log:', logError)
    // 로그 실패는 주문 업데이트를 롤백하지 않음 (best effort)
  }
  
  return NextResponse.json({ 
    success: true,
    order: { ...order, ...updateData },
  })
}
