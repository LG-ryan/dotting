/**
 * DOTTING PDF API - GET /api/ai/book/compile/[id]/pdf
 * 
 * 스냅샷 기반 PDF 데이터 조회
 * - is_hidden=false인 문단만 포함
 * - 레이아웃 순서대로 정렬
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReviewStatus, ParagraphType } from '@/types/database'

interface PdfParagraph {
  id: string
  content: string
  paragraph_type: ParagraphType
  chapter_order_index: number
  paragraph_order_index: number
}

interface PdfChapter {
  order_index: number
  title: string | null
  paragraphs: PdfParagraph[]
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
    
    // 컴파일 조회 + 소유권 확인
    const { data: compilation, error: fetchError } = await supabase
      .from('compilations')
      .select(`
        id,
        status,
        review_status,
        pdf_snapshot_version,
        pdf_snapshot_at,
        result_meta,
        sessions!inner(user_id, subject_name)
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
      pdf_snapshot_at: string | null
      result_meta: any
      sessions: { user_id: string; subject_name: string }[]
    }
    
    // 소유권 확인
    if (compData.sessions[0]?.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 컴파일에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // PDF 생성 가능 상태 확인
    const pdfStatuses: ReviewStatus[] = ['approved_for_pdf', 'approved_for_print', 'printed']
    if (!pdfStatuses.includes(compData.review_status)) {
      return NextResponse.json(
        { 
          error: 'PDF를 생성할 수 없는 상태입니다.',
          review_status: compData.review_status,
          required: 'approved_for_pdf 이상'
        },
        { status: 400 }
      )
    }
    
    // 스냅샷 버전 확인
    if (!compData.pdf_snapshot_version) {
      return NextResponse.json(
        { error: 'PDF 스냅샷이 없습니다. 먼저 [PDF 만들기]를 진행해주세요.' },
        { status: 400 }
      )
    }
    
    // 스냅샷에서 문단 조회 (is_hidden=false만)
    const { data: snapshots, error: snapshotError } = await supabase
      .from('compiled_paragraph_snapshots')
      .select('*')
      .eq('compilation_id', compilationId)
      .eq('pdf_snapshot_version', compData.pdf_snapshot_version)
      .eq('is_hidden', false)
      .order('chapter_order_index', { ascending: true })
      .order('paragraph_order_index', { ascending: true })
    
    if (snapshotError) {
      console.error('[DOTTING PDF] Snapshot fetch error:', snapshotError)
      return NextResponse.json(
        { error: '스냅샷 조회에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    // 챕터별로 그룹핑
    const { data: chapters } = await supabase
      .from('compiled_chapters')
      .select('order_index, title')
      .eq('compilation_id', compilationId)
      .order('order_index', { ascending: true })
    
    const chapterMap = new Map<number, PdfChapter>()
    
    for (const ch of (chapters || [])) {
      chapterMap.set(ch.order_index, {
        order_index: ch.order_index,
        title: ch.title,
        paragraphs: []
      })
    }
    
    for (const snap of (snapshots || [])) {
      const chapter = chapterMap.get(snap.chapter_order_index)
      if (chapter) {
        chapter.paragraphs.push({
          id: snap.paragraph_id,
          content: snap.content,
          paragraph_type: snap.paragraph_type as ParagraphType,
          chapter_order_index: snap.chapter_order_index,
          paragraph_order_index: snap.paragraph_order_index
        })
      }
    }
    
    const pdfChapters = Array.from(chapterMap.values())
      .filter(ch => ch.paragraphs.length > 0)
      .sort((a, b) => a.order_index - b.order_index)
    
    // 책 메타 정보
    const bookMeta = compData.result_meta?.book_meta || {}
    
    return NextResponse.json({
      success: true,
      pdf: {
        compilation_id: compilationId,
        snapshot_version: compData.pdf_snapshot_version,
        snapshot_at: compData.pdf_snapshot_at,
        meta: {
          title: bookMeta.title || `${compData.sessions[0]?.subject_name}의 이야기`,
          intro: bookMeta.intro || null,
          outro: bookMeta.outro || null
        },
        chapters: pdfChapters,
        stats: {
          chapter_count: pdfChapters.length,
          paragraph_count: pdfChapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0)
        }
      }
    })
    
  } catch (error) {
    console.error('[DOTTING PDF] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
