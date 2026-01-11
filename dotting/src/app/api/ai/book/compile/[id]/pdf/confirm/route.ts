/**
 * DOTTING PDF Confirm API - POST /api/ai/book/compile/[id]/pdf/confirm
 * 
 * PDF 내용 확인 기록 (인쇄 확정 전 필수)
 * - 자녀(구매자)만 가능
 * - approved_for_pdf 상태에서만 가능
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReviewStatus } from '@/types/database'

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
    
    // 컴파일 조회 + 소유권 확인
    const { data: compilation, error: fetchError } = await supabase
      .from('compilations')
      .select(`
        id,
        status,
        review_status,
        pdf_snapshot_version,
        pdf_confirmed_at,
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
    
    const compData = compilation as unknown as {
      id: string
      status: string
      review_status: ReviewStatus
      pdf_snapshot_version: number | null
      pdf_confirmed_at: string | null
      sessions: { user_id: string }[]
    }
    
    // 소유권 확인
    if (compData.sessions[0]?.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 컴파일에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 상태 확인: approved_for_pdf에서만 가능
    if (compData.review_status !== 'approved_for_pdf') {
      return NextResponse.json(
        { 
          error: 'PDF 확인은 PDF 미리보기 상태에서만 가능합니다.',
          current_status: compData.review_status
        },
        { status: 400 }
      )
    }
    
    // 스냅샷 확인
    if (!compData.pdf_snapshot_version) {
      return NextResponse.json(
        { error: 'PDF 스냅샷이 없습니다.' },
        { status: 400 }
      )
    }
    
    // 이미 확인했는지 체크
    if (compData.pdf_confirmed_at) {
      return NextResponse.json({
        success: true,
        message: '이미 확인되었습니다.',
        confirmed_at: compData.pdf_confirmed_at
      })
    }
    
    // 확인 기록
    const now = new Date().toISOString()
    const { error: updateError } = await (supabase
      .from('compilations') as any)
      .update({
        pdf_confirmed_at: now,
        pdf_confirmed_by: user.id
      })
      .eq('id', compilationId)
    
    if (updateError) {
      console.error('[DOTTING PDF Confirm] Update error:', updateError)
      return NextResponse.json(
        { error: '확인 기록에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    console.log(`[DOTTING PDF Confirm] ${compilationId} confirmed by ${user.id}`)
    
    return NextResponse.json({
      success: true,
      confirmed_at: now,
      confirmed_by: user.id
    })
    
  } catch (error) {
    console.error('[DOTTING PDF Confirm] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
