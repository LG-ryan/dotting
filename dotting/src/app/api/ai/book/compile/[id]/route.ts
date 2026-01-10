/**
 * DOTTING Book Compile API - GET /api/ai/book/compile/[id]
 * 
 * 컴파일 결과를 조회합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    
    // 컴파일 조회
    const { data: compilation, error: compileError } = await supabase
      .from('compilations')
      .select(`
        *,
        sessions!inner (
          id,
          user_id,
          subject_name
        )
      `)
      .eq('id', compilationId)
      .single()
    
    if (compileError || !compilation) {
      return NextResponse.json(
        { error: '컴파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 소유권 확인
    if (compilation.sessions.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 컴파일에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 완료된 경우 챕터/문단도 조회
    let chapters = null
    if (compilation.status === 'completed') {
      const { data: chaptersData } = await supabase
        .from('compiled_chapters')
        .select(`
          id,
          order_index,
          title,
          compiled_paragraphs (
            id,
            order_index,
            content,
            paragraph_type,
            revision,
            compiled_paragraph_sources (
              episode_id,
              message_ids
            )
          )
        `)
        .eq('compilation_id', compilationId)
        .order('order_index', { ascending: true })
      
      chapters = chaptersData?.map(ch => ({
        ...ch,
        compiled_paragraphs: ch.compiled_paragraphs
          ?.sort((a: any, b: any) => a.order_index - b.order_index)
      }))
    }
    
    // 에피소드 선별 결과 조회
    const { data: episodeInclusions } = await supabase
      .from('compilation_episode_inclusions')
      .select(`
        episode_id,
        inclusion_status,
        decision_reason,
        signals
      `)
      .eq('compilation_id', compilationId)
    
    // 챕터 데이터를 Viewer 형식으로 변환
    const formattedChapters = chapters?.map((ch: any) => ({
      id: ch.id,
      order_index: ch.order_index,
      title: ch.title,
      paragraphs: ch.compiled_paragraphs?.map((p: any) => ({
        id: p.id,
        order_index: p.order_index,
        content: p.content,
        paragraph_type: p.paragraph_type
      })) || []
    })) || []
    
    return NextResponse.json({
      compilation: {
        id: compilation.id,
        session_id: compilation.session_id,
        version: compilation.version,
        intent: compilation.intent,
        status: compilation.status,
        progress: compilation.progress,
        review_status: compilation.review_status,
        pdf_snapshot_version: compilation.pdf_snapshot_version,
        pdf_confirmed_at: compilation.pdf_confirmed_at,
        pdf_confirmed_by: compilation.pdf_confirmed_by,
        result_meta: compilation.result_meta,
        error_message: compilation.error_message,
        error_detail: compilation.error_detail,
        created_at: compilation.created_at,
        completed_at: compilation.completed_at,
        subject_name: compilation.sessions.subject_name
      },
      chapters: formattedChapters,
      episode_inclusions: episodeInclusions
    })
    
  } catch (error) {
    console.error('[DOTTING API] Get compile error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
