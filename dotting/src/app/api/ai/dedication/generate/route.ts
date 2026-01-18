/**
 * POST /api/ai/dedication/generate
 * 
 * 헌정사 제안 생성 API (백그라운드 작업)
 * - compilation 승인 시 자동 호출
 * - DOTTING Core Engine을 통한 3가지 제안 생성
 * - orders 테이블에 저장
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDottingDedication } from '@/lib/dotting-core-engine'

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    console.log(`[Dedication Generate] 주문 ${orderId}의 헌정사 생성 시작`)

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        package,
        session:sessions!orders_session_id_fkey (
          id,
          subject_name,
          episodes (
            id,
            content,
            created_at
          ),
          audio_playlists (
            id,
            title,
            audio_url
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[Dedication Generate] 주문 조회 실패:', orderError)
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

    // Heritage 패키지만 헌정사 제공
    if (order.package !== 'premium') {
      return NextResponse.json(
        { error: 'Heritage 패키지만 헌정사를 제공합니다' },
        { status: 400 }
      )
    }

    // 세션 정보 확인
    const session = Array.isArray(order.session) ? order.session[0] : order.session
    if (!session) {
      return NextResponse.json(
        { error: '세션 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const subjectName = session.subject_name || '부모님'
    const episodes = session.episodes || []
    const markedMoments = session.audio_playlists || []

    console.log(`[Dedication Generate] 화자: ${subjectName}, 에피소드: ${episodes.length}개`)

    // DOTTING Core Engine을 통한 헌정사 생성
    const result = await generateDottingDedication(
      subjectName,
      episodes,
      markedMoments
    )

    console.log('[Dedication Generate] 생성 완료:', result)

    // orders 테이블에 저장
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        dedication_suggestions: result.suggestions,
        dedication_generated_at: result.generated_at,
        dedication_generation_cost: result.token_count
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('[Dedication Generate] 저장 실패:', updateError)
      return NextResponse.json(
        { error: '헌정사 저장에 실패했습니다' },
        { status: 500 }
      )
    }

    console.log(`[Dedication Generate] 주문 ${orderId}의 헌정사 저장 완료`)

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      generated_at: result.generated_at,
      token_count: result.token_count
    })

  } catch (error) {
    console.error('[Dedication Generate] 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
