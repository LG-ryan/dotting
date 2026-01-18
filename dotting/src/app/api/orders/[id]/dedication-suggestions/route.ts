/**
 * GET /api/orders/[id]/dedication-suggestions
 * 
 * 헌정사 제안 조회 API
 * - DOTTING Core Engine이 생성한 3가지 제안 반환
 * - 백그라운드에서 미리 생성된 제안 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, dedication_suggestions, dedication_generated_at, dedication_generation_cost')
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

    // 제안이 없는 경우
    if (!order.dedication_suggestions) {
      return NextResponse.json(
        { 
          suggestions: null,
          generated_at: null,
          message: '헌정사 제안이 아직 생성되지 않았습니다'
        },
        { status: 200 }
      )
    }

    // 제안 반환
    return NextResponse.json({
      suggestions: order.dedication_suggestions,
      generated_at: order.dedication_generated_at,
      token_count: order.dedication_generation_cost
    })

  } catch (error) {
    console.error('[Dedication Suggestions API] 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
