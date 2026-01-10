/**
 * DOTTING Book Compile Worker - 내부 전용
 * 
 * 백그라운드에서 실제 컴파일 작업 실행
 * 시크릿 헤더로 내부 호출만 허용
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runCompileJob } from '../../lib/compile-runner'
import type { CompileOptions } from '../../lib/types'
import type { CompilationIntent } from '@/types/database'

interface WorkerRequestBody {
  compilationId: string
  sessionId: string
  intent: CompilationIntent
  options: CompileOptions
}

export async function POST(request: NextRequest) {
  // 내부 호출 인증
  const internalSecret = request.headers.get('X-Internal-Secret')
  if (internalSecret !== process.env.INTERNAL_API_SECRET) {
    console.warn('[DOTTING Worker] Unauthorized access attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const requestSource = request.headers.get('X-Request-Source')
  console.log(`[DOTTING Worker] Request received, source: ${requestSource}`)
  
  try {
    const body: WorkerRequestBody = await request.json()
    
    if (!body.compilationId || !body.sessionId) {
      return NextResponse.json(
        { error: 'compilationId와 sessionId가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // 단일 실행 보장: pending인 경우에만 processing으로 전환 (CAS)
    const { data: updated, error: updateError } = await supabase
      .from('compilations')
      .update({ 
        status: 'processing',
        progress: {
          phase: null,
          percent: 0,
          message: '시작하는 중...',
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', body.compilationId)
      .eq('status', 'pending')
      .select()
      .single()
    
    if (updateError || !updated) {
      // 이미 processing 중이거나 완료됨 - 중복 실행 방지
      console.log(`[DOTTING Worker] Compilation ${body.compilationId} already processing or completed`)
      return NextResponse.json({
        success: false,
        message: 'Already processing or completed'
      })
    }
    
    console.log(`[DOTTING Worker] Starting job for compilation ${body.compilationId}`)
    
    // 실제 작업 실행
    const result = await runCompileJob({
      compilationId: body.compilationId,
      sessionId: body.sessionId,
      intent: body.intent,
      options: body.options
    })
    
    console.log(`[DOTTING Worker] Job completed: ${result.success ? 'success' : 'failed'}`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('[DOTTING Worker] Error:', error)
    return NextResponse.json(
      { error: '워커 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
