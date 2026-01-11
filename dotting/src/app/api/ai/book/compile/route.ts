/**
 * DOTTING Book Compile API - POST /api/ai/book/compile
 * 
 * 비동기 방식: 즉시 compilationId 반환, 백그라운드에서 작업 실행
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CompilationIntent } from '@/types/database'
import type { CompileOptions } from '../lib/types'
import { DEFAULT_COMPILE_OPTIONS } from '../lib/types'
import { requirePayment } from '@/lib/payment-gate'

interface CompileRequestBody {
  sessionId: string
  intent: CompilationIntent
  idempotencyKey?: string
  options?: Partial<CompileOptions>
}

export async function POST(request: NextRequest) {
  try {
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
    const body: CompileRequestBody = await request.json()
    
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'sessionId가 필요합니다.' },
        { status: 400 }
      )
    }
    
    if (!body.intent || !['preview', 'final'].includes(body.intent)) {
      return NextResponse.json(
        { error: 'intent는 "preview" 또는 "final"이어야 합니다.' },
        { status: 400 }
      )
    }
    
    // 세션 소유권 확인
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', body.sessionId)
      .single()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const sessionData = session as { id: string; user_id: string }
    if (sessionData.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 세션에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    // 결제 게이트: paid 상태가 아니면 LLM 호출 차단
    const paymentGate = await requirePayment(body.sessionId)
    if (!paymentGate.allowed) {
      return paymentGate.response
    }
    
    // Idempotency 체크
    if (body.idempotencyKey) {
      const { data: existing } = await supabase
        .from('compilations')
        .select('id, version, status, progress, result_meta, error_message')
        .eq('session_id', body.sessionId)
        .eq('idempotency_key', body.idempotencyKey)
        .single()
      
      if (existing) {
        const existingData = existing as { 
          id: string; version: number; status: string; 
          progress: unknown; result_meta: unknown; error_message: string | null 
        }
        // pending/processing이면 기존 반환
        if (existingData.status === 'pending' || existingData.status === 'processing') {
          return NextResponse.json({
            success: true,
            compilation: existingData,
            isExisting: true
          })
        }
        // completed이면 기존 반환
        if (existingData.status === 'completed') {
          return NextResponse.json({
            success: true,
            compilation: existingData,
            isExisting: true
          })
        }
        // failed이면 새 version 생성 (아래로 계속)
      }
    }
    
    // 옵션 병합
    const options: CompileOptions = {
      ...DEFAULT_COMPILE_OPTIONS,
      ...body.options
    }
    
    // preview에서만 appendix 허용
    if (body.intent === 'preview') {
      options.allowAppendix = true
    }
    
    // 새 버전 번호 계산
    const { data: latestVersionData } = await supabase
      .from('compilations')
      .select('version')
      .eq('session_id', body.sessionId)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    const latestVersion = latestVersionData as { version: number } | null
    const newVersion = (latestVersion?.version ?? 0) + 1
    
    // 새 compilation 생성 (pending 상태)
    const insertData = {
      session_id: body.sessionId,
      version: newVersion,
      intent: body.intent,
      status: 'pending' as const,
      preferred_structure: options.structureMode,
      chapter_count_min: options.chapterCountMin,
      chapter_count_max: options.chapterCountMax,
      paragraphs_per_chapter_min: options.paragraphsPerChapterMin,
      paragraphs_per_chapter_max: options.paragraphsPerChapterMax,
      editor_notes: options.editorNotes,
      idempotency_key: body.idempotencyKey,
      progress: {
        phase: null,
        percent: 0,
        message: '준비 중...',
        updated_at: new Date().toISOString()
      }
    }
    
    const { data: compilationData, error: createError } = await supabase
      .from('compilations')
      .insert(insertData as any)
      .select()
      .single()
    
    if (createError || !compilationData) {
      console.error('[DOTTING Compile] Create error:', createError)
      return NextResponse.json(
        { error: '컴파일 생성에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    const compilation = compilationData as { 
      id: string; version: number; status: string; progress: unknown 
    }
    
    // 백그라운드 작업 트리거 (fire-and-forget)
    const workerUrl = new URL('/api/ai/book/compile/worker', request.url)
    
    fetch(workerUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
        'X-Request-Source': 'internal'
      },
      body: JSON.stringify({
        compilationId: compilation.id,
        sessionId: body.sessionId,
        intent: body.intent,
        options
      })
    }).catch(err => {
      console.error('[DOTTING Compile] Worker trigger failed:', err)
    })
    
    console.log(`[DOTTING Compile] Created compilation ${compilation.id}, triggering worker...`)
    
    // 즉시 응답
    return NextResponse.json({
      success: true,
      compilation: {
        id: compilation.id,
        version: compilation.version,
        status: compilation.status,
        progress: compilation.progress
      },
      isExisting: false
    })
    
  } catch (error) {
    console.error('[DOTTING Compile] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
