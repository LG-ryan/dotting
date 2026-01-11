/**
 * DOTTING Review Status API - PATCH /api/ai/book/compile/[id]/review-status
 * 
 * 검수 상태 변경 (자녀만, 허용된 전이만)
 * approved_for_pdf 전환 시 스냅샷 생성
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReviewStatus, ParagraphType } from '@/types/database'

// 자녀가 할 수 있는 전이 규칙
const ALLOWED_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  'pending_review': ['approved_for_edit', 'needs_fixes'],
  'needs_fixes': ['approved_for_edit'],
  'approved_for_edit': ['approved_for_pdf', 'pending_review'],
  'approved_for_pdf': ['approved_for_print', 'approved_for_edit'],
  'approved_for_print': [], // 자녀 전이 불가
  'printed': [],            // 최종 상태
  'print_failed': []        // CS 플로우만
}

interface ReviewStatusRequest {
  toStatus: ReviewStatus
  reason?: string
}

export async function PATCH(
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
    const body: ReviewStatusRequest = await request.json()
    
    if (!body.toStatus) {
      return NextResponse.json(
        { error: 'toStatus가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 현재 컴파일 상태 조회 + 소유권 확인
    const { data: compilation, error: fetchError } = await supabase
      .from('compilations')
      .select(`
        id,
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
      status: string
      review_status: ReviewStatus
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
    
    // 컴파일 완료 상태인지 확인
    if (compilationData.status !== 'completed') {
      return NextResponse.json(
        { error: '컴파일이 완료되지 않았습니다.' },
        { status: 400 }
      )
    }
    
    const fromStatus = compilationData.review_status
    const toStatus = body.toStatus
    
    // 전이 규칙 확인
    const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || []
    if (!allowedNext.includes(toStatus)) {
      return NextResponse.json(
        { 
          error: `${fromStatus}에서 ${toStatus}로 변경할 수 없습니다.`,
          allowedTransitions: allowedNext
        },
        { status: 400 }
      )
    }
    
    // approved_for_print 전환 시 추가 조건 확인
    if (toStatus === 'approved_for_print') {
      // 1. 스냅샷 존재 확인
      if (!compilationData.pdf_snapshot_version) {
        return NextResponse.json(
          { error: 'PDF 스냅샷이 없습니다. 먼저 [PDF 만들기]를 진행해주세요.' },
          { status: 400 }
        )
      }
      
      // 2. PDF 확인 여부 확인
      if (!compilationData.pdf_confirmed_at || !compilationData.pdf_confirmed_by) {
        return NextResponse.json(
          { error: 'PDF 내용을 확인해주세요. 확인 체크 후 인쇄 확정이 가능합니다.' },
          { status: 400 }
        )
      }
      
      // 3. 확인자가 현재 사용자인지 확인
      if (compilationData.pdf_confirmed_by !== user.id) {
        return NextResponse.json(
          { error: 'PDF 확인은 본인만 할 수 있습니다.' },
          { status: 403 }
        )
      }
    }
    
    let newSnapshotVersion: number | null = null
    
    // approved_for_pdf로 전환 시 스냅샷 생성
    if (toStatus === 'approved_for_pdf') {
      // 1. 스냅샷 버전 원자적 증가
      const { data: updatedComp, error: versionError } = await (supabase
        .from('compilations') as any)
        .update({
          pdf_snapshot_version: (compilationData.pdf_snapshot_version || 0) + 1,
          pdf_snapshot_at: new Date().toISOString(),
          review_status: toStatus
        })
        .eq('id', compilationId)
        .select('pdf_snapshot_version')
        .single()
      
      if (versionError || !updatedComp) {
        console.error('[DOTTING ReviewStatus] Version update error:', versionError)
        return NextResponse.json(
          { error: '스냅샷 버전 생성에 실패했습니다.' },
          { status: 500 }
        )
      }
      
      newSnapshotVersion = updatedComp.pdf_snapshot_version
      
      // 2. 현재 문단들 조회
      const { data: chapters, error: chaptersError } = await supabase
        .from('compiled_chapters')
        .select(`
          id,
          order_index,
          compiled_paragraphs (
            id,
            order_index,
            content,
            paragraph_type,
            is_hidden
          )
        `)
        .eq('compilation_id', compilationId)
        .order('order_index', { ascending: true })
      
      if (chaptersError || !chapters) {
        console.error('[DOTTING ReviewStatus] Chapters fetch error:', chaptersError)
        return NextResponse.json(
          { error: '문단 조회에 실패했습니다.' },
          { status: 500 }
        )
      }
      
      // 3. 스냅샷 레코드 생성
      const snapshotRecords: Array<{
        compilation_id: string
        pdf_snapshot_version: number
        paragraph_id: string
        chapter_order_index: number
        paragraph_order_index: number
        content: string
        paragraph_type: ParagraphType
        is_hidden: boolean
      }> = []
      
      for (const chapter of chapters as any[]) {
        const paragraphs = chapter.compiled_paragraphs || []
        for (const para of paragraphs) {
          snapshotRecords.push({
            compilation_id: compilationId,
            pdf_snapshot_version: newSnapshotVersion!,
            paragraph_id: para.id,
            chapter_order_index: chapter.order_index,
            paragraph_order_index: para.order_index,
            content: para.content,
            paragraph_type: para.paragraph_type,
            is_hidden: para.is_hidden
          })
        }
      }
      
      if (snapshotRecords.length > 0) {
        const { error: snapshotError } = await (supabase
          .from('compiled_paragraph_snapshots') as any)
          .insert(snapshotRecords)
        
        if (snapshotError) {
          console.error('[DOTTING ReviewStatus] Snapshot insert error:', snapshotError)
          return NextResponse.json(
            { error: '스냅샷 저장에 실패했습니다.' },
            { status: 500 }
          )
        }
      }
      
      console.log(`[DOTTING ReviewStatus] Created snapshot v${newSnapshotVersion} with ${snapshotRecords.length} paragraphs`)
      
    } else {
      // 일반 상태 변경
      const { error: updateError } = await supabase
        .from('compilations')
        .update({ review_status: toStatus })
        .eq('id', compilationId)
      
      if (updateError) {
        console.error('[DOTTING ReviewStatus] Update error:', updateError)
        return NextResponse.json(
          { error: '상태 변경에 실패했습니다.' },
          { status: 500 }
        )
      }
    }
    
    // 로그 기록
    const { error: logError } = await (supabase
      .from('review_status_logs') as any)
      .insert({
        compilation_id: compilationId,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by: user.id,
        changed_by_type: 'user',
        reason: body.reason || null
      })
    
    if (logError) {
      console.error('[DOTTING ReviewStatus] Log error:', logError)
      // 로그 실패는 치명적이지 않음, 경고만
    }
    
    console.log(`[DOTTING ReviewStatus] ${compilationId}: ${fromStatus} → ${toStatus}`)
    
    return NextResponse.json({
      success: true,
      fromStatus,
      toStatus,
      snapshotVersion: newSnapshotVersion
    })
    
  } catch (error) {
    console.error('[DOTTING ReviewStatus] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
