/**
 * DOTTING Print Order API
 * 
 * POST: 인쇄 주문 생성 (approved_for_pdf → approved_for_print 전환 포함)
 * GET: 현재 주문 상태 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePayment } from '@/lib/payment-gate'

interface CreatePrintOrderRequest {
  recipient_name: string
  recipient_phone: string
  shipping_address: string
  shipping_address_detail?: string
  postal_code: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: compilationId } = await params
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    // 요청 파싱
    const body: CreatePrintOrderRequest = await request.json()
    
    // 필수 필드 검증
    if (!body.recipient_name || !body.recipient_phone || !body.shipping_address || !body.postal_code) {
      return NextResponse.json(
        { error: '배송 정보를 모두 입력해주세요.' },
        { status: 400 }
      )
    }
    
    // 현재 컴파일 상태 조회 + 소유권 확인
    const { data: compilation, error: fetchError } = await supabase
      .from('compilations')
      .select(`
        id,
        session_id,
        status,
        review_status,
        pdf_snapshot_version,
        pdf_confirmed_at,
        pdf_confirmed_by,
        sessions!inner(user_id)
      `)
      .eq('id', compilationId)
      .single()
    
    if (fetchError || !compilation) {
      return NextResponse.json(
        { error: '컴파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 타입 단언
    const compilationData = compilation as unknown as {
      id: string
      session_id: string
      status: string
      review_status: string
      pdf_snapshot_version: number | null
      pdf_confirmed_at: string | null
      pdf_confirmed_by: string | null
      sessions: { user_id: string }[]
    }
    
    // 소유권 확인
    if (compilationData.sessions[0]?.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 컴파일에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 결제 게이트: 인쇄 주문은 유료 기능
    const paymentGate = await requirePayment(compilationData.session_id)
    if (!paymentGate.allowed) {
      return paymentGate.response
    }
    
    // approved_for_pdf 상태인지 확인
    if (compilationData.review_status !== 'approved_for_pdf') {
      return NextResponse.json(
        { error: 'PDF 승인 상태에서만 인쇄 주문이 가능합니다.' },
        { status: 400 }
      )
    }
    
    // PDF 확인 여부 확인
    if (!compilationData.pdf_confirmed_at || !compilationData.pdf_confirmed_by) {
      return NextResponse.json(
        { error: 'PDF 내용을 먼저 확인해주세요.' },
        { status: 400 }
      )
    }
    
    // 스냅샷 존재 확인
    if (!compilationData.pdf_snapshot_version) {
      return NextResponse.json(
        { error: 'PDF 스냅샷이 없습니다.' },
        { status: 400 }
      )
    }
    
    // 기존 주문 확인 (중복 방지)
    const { data: existingOrder } = await (supabase
      .from('print_orders') as any)
      .select('id')
      .eq('compilation_id', compilationId)
      .single()
    
    if (existingOrder) {
      return NextResponse.json(
        { error: '이미 인쇄 주문이 존재합니다.' },
        { status: 400 }
      )
    }
    
    // 인쇄 주문 생성
    const { data: printOrder, error: orderError } = await (supabase
      .from('print_orders') as any)
      .insert({
        compilation_id: compilationId,
        status: 'pending',
        recipient_name: body.recipient_name,
        recipient_phone: body.recipient_phone,
        shipping_address: body.shipping_address,
        shipping_address_detail: body.shipping_address_detail || null,
        postal_code: body.postal_code,
      })
      .select()
      .single()
    
    if (orderError) {
      console.error('[DOTTING PrintOrder] Create error:', orderError)
      return NextResponse.json(
        { error: '인쇄 주문 생성에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    // 컴파일 상태를 approved_for_print로 변경
    const { error: updateError } = await supabase
      .from('compilations')
      .update({ review_status: 'approved_for_print' })
      .eq('id', compilationId)
    
    if (updateError) {
      console.error('[DOTTING PrintOrder] Status update error:', updateError)
      // 롤백: 주문 삭제
      await (supabase.from('print_orders') as any).delete().eq('id', printOrder.id)
      return NextResponse.json(
        { error: '상태 변경에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    // 로그 기록
    await (supabase.from('review_status_logs') as any).insert({
      compilation_id: compilationId,
      from_status: 'approved_for_pdf',
      to_status: 'approved_for_print',
      changed_by: user.id,
      changed_by_type: 'user',
      reason: '인쇄 주문 생성'
    })
    
    console.log(`[DOTTING PrintOrder] Created order ${printOrder.id} for compilation ${compilationId}`)
    
    return NextResponse.json({
      success: true,
      printOrder,
    })
    
  } catch (error) {
    console.error('[DOTTING PrintOrder] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: compilationId } = await params
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    // 소유권 확인을 위해 컴파일 조회
    const { data: compilation, error: fetchError } = await supabase
      .from('compilations')
      .select(`
        id,
        sessions!inner(user_id)
      `)
      .eq('id', compilationId)
      .single()
    
    if (fetchError || !compilation) {
      return NextResponse.json(
        { error: '컴파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const compilationData = compilation as unknown as {
      id: string
      sessions: { user_id: string }[]
    }
    
    if (compilationData.sessions[0]?.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 컴파일에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 주문 조회
    const { data: printOrder, error: orderError } = await (supabase
      .from('print_orders') as any)
      .select('*')
      .eq('compilation_id', compilationId)
      .single()
    
    if (orderError && orderError.code !== 'PGRST116') {
      console.error('[DOTTING PrintOrder] Fetch error:', orderError)
      return NextResponse.json(
        { error: '주문 조회에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      printOrder: printOrder || null,
    })
    
  } catch (error) {
    console.error('[DOTTING PrintOrder] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
