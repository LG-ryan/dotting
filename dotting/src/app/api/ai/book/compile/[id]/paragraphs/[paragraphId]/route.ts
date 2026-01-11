/**
 * DOTTING Paragraph Edit API - PATCH /api/ai/book/compile/[id]/paragraphs/[paragraphId]
 * 
 * 문단 수정 (텍스트/숨김)
 * - compiled_paragraph_edits에 append
 * - approved_for_pdf 상태면 approved_for_edit로 되돌림
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReviewStatus } from '@/types/database'
import { logParagraphEdited, logReviewStatusChanged } from '@/lib/analytics'

interface ParagraphEditRequest {
  content?: string
  isHidden?: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paragraphId: string }> }
) {
  try {
    const { id: compilationId, paragraphId } = await params
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
    const body: ParagraphEditRequest = await request.json()
    
    if (body.content === undefined && body.isHidden === undefined) {
      return NextResponse.json(
        { error: 'content 또는 isHidden이 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 컴파일 + 소유권 확인
    const { data: compilation, error: compileError } = await supabase
      .from('compilations')
      .select(`
        id,
        status,
        review_status,
        session_id,
        sessions!inner(user_id)
      `)
      .eq('id', compilationId)
      .single()
    
    if (compileError || !compilation) {
      return NextResponse.json(
        { error: '컴파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const compData = compilation as unknown as {
      id: string
      status: string
      review_status: ReviewStatus
      session_id: string
      sessions: { user_id: string }[]
    }
    
    // 소유권 확인
    if (compData.sessions[0]?.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 컴파일에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 편집 가능 상태 확인
    const editableStatuses: ReviewStatus[] = ['pending_review', 'needs_fixes', 'approved_for_edit', 'approved_for_pdf']
    if (!editableStatuses.includes(compData.review_status)) {
      return NextResponse.json(
        { error: '인쇄가 확정되어 수정할 수 없어요.' },
        { status: 400 }
      )
    }
    
    // 문단 조회
    const { data: paragraph, error: paraError } = await supabase
      .from('compiled_paragraphs')
      .select(`
        id,
        chapter_id,
        content,
        revision,
        is_hidden,
        order_index,
        compiled_chapters!inner(compilation_id, order_index)
      `)
      .eq('id', paragraphId)
      .single()
    
    if (paraError || !paragraph) {
      return NextResponse.json(
        { error: '문단을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const paraData = paragraph as unknown as {
      id: string
      chapter_id: string
      content: string
      revision: number
      is_hidden: boolean
      order_index: number
      compiled_chapters: { compilation_id: string; order_index: number }[]
    }
    
    // 컴파일 ID 일치 확인
    if (paraData.compiled_chapters[0]?.compilation_id !== compilationId) {
      return NextResponse.json(
        { error: '문단이 이 컴파일에 속하지 않습니다.' },
        { status: 400 }
      )
    }
    
    const now = new Date().toISOString()
    let statusChanged = false
    
    // 텍스트 수정
    if (body.content !== undefined && body.content !== paraData.content) {
      // 수정 이력 추가
      const { error: editError } = await supabase
        .from('compiled_paragraph_edits')
        .insert({
          paragraph_id: paragraphId,
          edited_by_type: 'user',
          edited_by_user_id: user.id,
          before_content: paraData.content,
          after_content: body.content
        } as any)
      
      if (editError) {
        console.error('[DOTTING ParagraphEdit] Edit insert error:', editError)
        return NextResponse.json(
          { error: '수정 이력 저장에 실패했습니다.' },
          { status: 500 }
        )
      }
      
      // 문단 업데이트
      const { error: updateError } = await (supabase
        .from('compiled_paragraphs') as any)
        .update({
          content: body.content,
          revision: paraData.revision + 1,
          updated_at: now
        })
        .eq('id', paragraphId)
      
      if (updateError) {
        console.error('[DOTTING ParagraphEdit] Paragraph update error:', updateError)
        return NextResponse.json(
          { error: '문단 수정에 실패했습니다.' },
          { status: 500 }
        )
      }
    }
    
    // 숨김 상태 변경
    if (body.isHidden !== undefined && body.isHidden !== paraData.is_hidden) {
      const { error: hideError } = await (supabase
        .from('compiled_paragraphs') as any)
        .update({
          is_hidden: body.isHidden,
          updated_at: now
        })
        .eq('id', paragraphId)
      
      if (hideError) {
        console.error('[DOTTING ParagraphEdit] Hide update error:', hideError)
        return NextResponse.json(
          { error: '숨김 상태 변경에 실패했습니다.' },
          { status: 500 }
        )
      }
    }
    
    // approved_for_pdf 상태면 approved_for_edit로 되돌림
    if (compData.review_status === 'approved_for_pdf') {
      const { error: statusError } = await (supabase
        .from('compilations') as any)
        .update({
          review_status: 'approved_for_edit',
          pdf_snapshot_at: null  // 스냅샷 무효화
        })
        .eq('id', compilationId)
      
      if (!statusError) {
        statusChanged = true
        
        // 로그 기록
        await supabase
          .from('review_status_logs')
          .insert({
            compilation_id: compilationId,
            from_status: 'approved_for_pdf',
            to_status: 'approved_for_edit',
            changed_by: user.id,
            changed_by_type: 'user',
            reason: '문단 수정으로 인한 자동 전환'
          } as any)
      }
    }
    
    console.log(`[DOTTING ParagraphEdit] ${paragraphId} updated by ${user.id}`)
    
    // 이벤트 로깅
    if (body.content !== undefined && body.content !== paraData.content) {
      await logParagraphEdited(
        compData.session_id,
        user.id,
        paragraphId,
        {
          before_length: paraData.content?.length || 0,
          after_length: body.content.length,
          chapter_index: paraData.compiled_chapters[0]?.order_index,
          paragraph_index: paraData.order_index,
        }
      )
    }
    
    if (statusChanged) {
      await logReviewStatusChanged(
        compData.session_id,
        user.id,
        compilationId,
        'approved_for_pdf',
        'approved_for_edit'
      )
    }
    
    return NextResponse.json({
      success: true,
      paragraph: {
        id: paragraphId,
        content: body.content ?? paraData.content,
        revision: body.content !== undefined ? paraData.revision + 1 : paraData.revision,
        is_hidden: body.isHidden ?? paraData.is_hidden
      },
      statusChanged,
      newReviewStatus: statusChanged ? 'approved_for_edit' : compData.review_status
    })
    
  } catch (error) {
    console.error('[DOTTING ParagraphEdit] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
