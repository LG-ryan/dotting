/**
 * DOTTING Admin Print Order Status API
 * 
 * PATCH: 인쇄 주문 상태 변경 (관리자 전용)
 * - 상태 전이 규칙 검증
 * - 필수 입력 검증 (shipped 시 tracking_number)
 * - 로그 기록
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PrintOrderStatus } from '@/types/database'

interface StatusChangeRequest {
  toStatus: PrintOrderStatus
  tracking_carrier?: string
  tracking_number?: string
  admin_note?: string
  claim_reason?: string
  claim_resolution?: string
}

// 허용된 상태 전이 규칙
const ALLOWED_TRANSITIONS: Record<PrintOrderStatus, PrintOrderStatus[]> = {
  pending: ['printing'],
  printing: ['shipped'],
  shipped: ['delivered', 'claim_opened'],
  delivered: ['claim_opened'],
  claim_opened: ['claim_resolved'],
  claim_resolved: [],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    // 관리자 권한 확인
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!userData || !['admin', 'operator'].includes(userData.role || '')) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }
    
    // 요청 파싱
    const body: StatusChangeRequest = await request.json()
    const { toStatus, tracking_carrier, tracking_number, admin_note, claim_reason, claim_resolution } = body
    
    if (!toStatus) {
      return NextResponse.json(
        { error: 'toStatus가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 현재 주문 조회
    const { data: order, error: fetchError } = await (supabase
      .from('print_orders') as any)
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (fetchError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const fromStatus = order.status as PrintOrderStatus
    
    // 상태 전이 규칙 검증
    if (!ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus)) {
      return NextResponse.json(
        { error: `${fromStatus}에서 ${toStatus}로 변경할 수 없습니다.` },
        { status: 400 }
      )
    }
    
    // shipped 전환 시 송장번호 필수
    if (toStatus === 'shipped' && !tracking_number) {
      return NextResponse.json(
        { error: '발송 완료 시 송장번호가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {
      status: toStatus,
    }
    
    if (tracking_carrier) updateData.tracking_carrier = tracking_carrier
    if (tracking_number) updateData.tracking_number = tracking_number
    if (admin_note) updateData.admin_note = admin_note
    if (claim_reason) updateData.claim_reason = claim_reason
    if (claim_resolution) updateData.claim_resolution = claim_resolution
    
    // 타임스탬프 설정
    if (toStatus === 'shipped') {
      updateData.shipped_at = new Date().toISOString()
    } else if (toStatus === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    } else if (toStatus === 'claim_opened') {
      updateData.claim_opened_at = new Date().toISOString()
    } else if (toStatus === 'claim_resolved') {
      updateData.claim_resolved_at = new Date().toISOString()
    }
    
    updateData.processed_by = user.id
    
    // 주문 업데이트
    const { error: updateError } = await (supabase
      .from('print_orders') as any)
      .update(updateData)
      .eq('id', orderId)
    
    if (updateError) {
      console.error('[Admin PrintOrders] Update error:', updateError)
      return NextResponse.json(
        { error: '상태 변경에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    // 로그 기록
    const { error: logError } = await (supabase
      .from('print_order_logs') as any)
      .insert({
        print_order_id: orderId,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by: user.id,
        note: admin_note || null,
      })
    
    if (logError) {
      console.error('[Admin PrintOrders] Log error:', logError)
      // 로그 실패는 치명적이지 않으므로 계속 진행
    }
    
    // compilations의 review_status도 업데이트 (delivered 시)
    if (toStatus === 'delivered') {
      await supabase
        .from('compilations')
        .update({ review_status: 'printed' })
        .eq('id', order.compilation_id)
    }
    
    console.log(`[Admin PrintOrders] Order ${orderId}: ${fromStatus} → ${toStatus} by ${user.id}`)
    
    return NextResponse.json({
      success: true,
      fromStatus,
      toStatus,
    })
    
  } catch (error) {
    console.error('[Admin PrintOrders] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
