/**
 * PATCH /api/orders/[id]
 * 
 * 주문 정보 업데이트 API
 * - dedication 업데이트 지원
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const supabase = await createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 주문 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 권한 확인
    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // 업데이트 가능한 필드만 추출
    const updateData: any = {}
    if ('dedication' in body) {
      updateData.dedication = body.dedication
    }

    // 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      console.error('[Orders PATCH] 업데이트 실패:', updateError)
      return NextResponse.json(
        { error: '주문 업데이트에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Orders PATCH] 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
