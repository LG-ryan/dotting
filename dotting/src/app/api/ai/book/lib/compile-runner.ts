/**
 * DOTTING Book Compile Runner - 오케스트레이터
 * 
 * 실행 순서:
 * 1. Phase A: 에피소드 선별
 * 2. Phase B1: Citation Plan 생성
 * 3. Phase B2: 문단 작성
 * 4. Phase C: 메타 생성
 * 5. completed 전환 (final은 트리거 검증)
 * 
 * 안전장치:
 * - Phase별 checkpoint 저장
 * - progress.updated_at 갱신
 * - 에러 코드 세분화
 */

import { createClient } from '@/lib/supabase/server'
import type { 
  CompileOptions,
  CompileErrorCode,
  PhaseAOutput,
  PhaseB1Output,
  PhaseB2Output,
  PhaseCOutput,
  EpisodeForSelection,
  CompileProgress,
  CompilePhase
} from './types'
import { COMPILE_ERROR_CODES, PHASE_MESSAGES, PHASE_PERCENT } from './types'
import { selectEpisodes } from './episode-selector'
import { createCitationPlan } from './citation-planner'
import { writeParagraphs } from './paragraph-writer'
import { generateMeta } from './meta-generator'
import type { CompilationIntent } from '@/types/database'

interface RunCompileJobParams {
  compilationId: string
  sessionId: string
  intent: CompilationIntent
  options: CompileOptions
}

interface RunCompileJobResult {
  success: boolean
  error?: {
    code: CompileErrorCode
    message: string
    details?: unknown
  }
}

/**
 * 컴파일 작업 실행 (Worker에서 호출)
 */
export async function runCompileJob(params: RunCompileJobParams): Promise<RunCompileJobResult> {
  const supabase = await createClient()
  const { compilationId, sessionId, intent, options } = params
  
  try {
    // ============================================
    // Phase A: 에피소드 선별
    // ============================================
    await updateProgress(supabase, compilationId, 'A')
    
    const episodes = await fetchEpisodes(supabase, sessionId)
    if (episodes.length === 0) {
      await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.NO_EPISODES, 
        '선별할 에피소드가 없습니다.', { phase: 'A' })
      return {
        success: false,
        error: {
          code: COMPILE_ERROR_CODES.NO_EPISODES,
          message: '선별할 에피소드가 없습니다.'
        }
      }
    }
    
    const phaseAResult = await selectEpisodes(episodes, options)
    
    // Phase A 결과 저장
    await saveEpisodeSelections(supabase, compilationId, phaseAResult)
    
    if (phaseAResult.core_count === 0) {
      await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.NO_CORE_EPISODES, 
        '핵심 에피소드가 없습니다.', { phase: 'A', selections: phaseAResult.selections.length })
      return {
        success: false,
        error: {
          code: COMPILE_ERROR_CODES.NO_CORE_EPISODES,
          message: '핵심 에피소드가 없습니다. 더 많은 이야기가 필요합니다.'
        }
      }
    }
    
    // ============================================
    // Phase B1: Citation Plan 생성
    // ============================================
    await updateProgress(supabase, compilationId, 'B1')
    
    const selectedEpisodeIds = phaseAResult.selections
      .filter(s => s.inclusion_status === 'core' || s.inclusion_status === 'supporting')
      .map(s => s.episode_id)
    
    const selectedEpisodes = episodes.filter(e => selectedEpisodeIds.includes(e.id))
    const messages = await fetchMessages(supabase, sessionId)
    
    let phaseB1Result: PhaseB1Output
    try {
      phaseB1Result = await createCitationPlan(selectedEpisodes, messages, options, intent)
    } catch (error) {
      await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.LLM_ERROR, 
        'Citation plan 생성 실패', { phase: 'B1', error: String(error) })
      return {
        success: false,
        error: {
          code: COMPILE_ERROR_CODES.LLM_ERROR,
          message: 'Citation plan 생성에 실패했습니다.'
        }
      }
    }
    
    // B1 검증: grounded 문단에 source 있는지
    const groundedWithoutSource = phaseB1Result.chapters.flatMap(ch => 
      ch.paragraph_plans.filter(p => p.type === 'grounded' && p.source_message_ids.length === 0)
    )
    
    if (groundedWithoutSource.length > 0) {
      await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.GROUNDED_WITHOUT_SOURCE, 
        `${groundedWithoutSource.length}개의 grounded 문단에 source가 없습니다.`,
        { phase: 'B1', groundedWithoutSource })
      return {
        success: false,
        error: {
          code: COMPILE_ERROR_CODES.GROUNDED_WITHOUT_SOURCE,
          message: 'grounded 문단에 source가 없습니다.',
          details: groundedWithoutSource
        }
      }
    }
    
    // ============================================
    // Phase B2: 문단 작성
    // ============================================
    await updateProgress(supabase, compilationId, 'B2')
    
    let phaseB2Result: PhaseB2Output
    try {
      phaseB2Result = await writeParagraphs(phaseB1Result, messages, selectedEpisodes, options)
    } catch (error) {
      await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.LLM_ERROR, 
        '문단 작성 실패', { phase: 'B2', error: String(error) })
      return {
        success: false,
        error: {
          code: COMPILE_ERROR_CODES.LLM_ERROR,
          message: '문단 작성에 실패했습니다.'
        }
      }
    }
    
    // B2 검증: plan 밖 source 사용 금지
    for (const para of phaseB2Result.paragraphs) {
      const plan = phaseB1Result.chapters[para.chapter_index]?.paragraph_plans[para.paragraph_index]
      if (!plan) continue
      
      const planSourceSet = new Set(plan.source_message_ids)
      const outOfPlanSources = para.source_message_ids.filter(id => !planSourceSet.has(id))
      
      if (outOfPlanSources.length > 0) {
        await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.SOURCE_OUT_OF_PLAN,
          '문단이 plan에 없는 source를 사용했습니다.',
          { phase: 'B2', paragraph: para, outOfPlanSources })
        return {
          success: false,
          error: {
            code: COMPILE_ERROR_CODES.SOURCE_OUT_OF_PLAN,
            message: 'plan에 없는 source를 사용했습니다.',
            details: { paragraph: para, outOfPlanSources }
          }
        }
      }
    }
    
    // 챕터/문단 DB 저장
    await saveChaptersAndParagraphs(supabase, compilationId, phaseB1Result, phaseB2Result)
    
    // ============================================
    // Phase C: 메타 생성
    // ============================================
    await updateProgress(supabase, compilationId, 'C')
    
    let phaseCResult: PhaseCOutput
    try {
      phaseCResult = await generateMeta(phaseB1Result, phaseB2Result, selectedEpisodes, messages, options, intent)
    } catch (error) {
      await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.LLM_ERROR, 
        '메타 생성 실패', { phase: 'C', error: String(error) })
      return {
        success: false,
        error: {
          code: COMPILE_ERROR_CODES.LLM_ERROR,
          message: '메타 생성에 실패했습니다.'
        }
      }
    }
    
    // ============================================
    // 완료 처리
    // ============================================
    const resultMeta = buildResultMeta(phaseB1Result, phaseB2Result, phaseCResult)
    
    try {
      const { error: completeError } = await supabase
        .from('compilations')
        .update({ 
          status: 'completed',
          result_meta: resultMeta,
          progress: {
            phase: 'C',
            percent: 100,
            message: '완료!',
            updated_at: new Date().toISOString()
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', compilationId)
        .eq('status', 'processing')
      
      if (completeError) {
        // DB 트리거 검증 실패 가능성
        throw completeError
      }
    } catch (error) {
      await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.GROUNDING_TRIGGER_FAILED,
        'Final grounding 검증에 실패했습니다.',
        { phase: 'complete', error: String(error), compilationId })
      return {
        success: false,
        error: {
          code: COMPILE_ERROR_CODES.GROUNDING_TRIGGER_FAILED,
          message: 'Final grounding 검증에 실패했습니다.'
        }
      }
    }
    
    console.log(`[DOTTING Runner] Compilation ${compilationId} completed successfully!`)
    
    return { success: true }
    
  } catch (error) {
    console.error('[DOTTING Runner] Unexpected error:', error)
    
    await markFailed(supabase, compilationId, COMPILE_ERROR_CODES.INTERNAL_ERROR, 
      error instanceof Error ? error.message : '알 수 없는 오류',
      { error: String(error) })
    
    return {
      success: false,
      error: {
        code: COMPILE_ERROR_CODES.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : '알 수 없는 오류',
        details: error
      }
    }
  }
}

// ============================================
// Helper Functions
// ============================================

async function updateProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  compilationId: string,
  phase: CompilePhase
): Promise<void> {
  const progress: CompileProgress = {
    phase,
    percent: PHASE_PERCENT[phase],
    message: PHASE_MESSAGES[phase],
    updated_at: new Date().toISOString()
  }
  
  await supabase
    .from('compilations')
    .update({ progress })
    .eq('id', compilationId)
  
  console.log(`[DOTTING Runner] Phase ${phase}: ${PHASE_MESSAGES[phase]}`)
}

async function markFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  compilationId: string,
  errorCode: CompileErrorCode,
  errorMessage: string,
  errorDetail: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('compilations')
    .update({ 
      status: 'failed',
      error_message: `[${errorCode}] ${errorMessage}`,
      error_detail: {
        code: errorCode,
        message: errorMessage,
        ...errorDetail,
        timestamp: new Date().toISOString()
      },
      progress: {
        phase: errorDetail.phase || null,
        percent: 0,
        message: '실패',
        updated_at: new Date().toISOString()
      }
    })
    .eq('id', compilationId)
  
  console.error(`[DOTTING Runner] Failed: [${errorCode}] ${errorMessage}`, errorDetail)
}

async function fetchEpisodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<EpisodeForSelection[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true })
  
  if (error) throw error
  return data || []
}

async function fetchMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<Array<{ id: string; role: string; content: string; order_index: number }>> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, order_index')
    .eq('session_id', sessionId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true })
  
  if (error) throw error
  return data || []
}

async function saveEpisodeSelections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  compilationId: string,
  phaseAResult: PhaseAOutput
): Promise<void> {
  const insertData = phaseAResult.selections.map(s => ({
    compilation_id: compilationId,
    episode_id: s.episode_id,
    inclusion_status: s.inclusion_status,
    decision_reason: s.decision_reason,
    signals: s.signals
  }))
  
  const { error } = await supabase
    .from('compilation_episode_inclusions')
    .insert(insertData)
  
  if (error) throw error
}

async function saveChaptersAndParagraphs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  compilationId: string,
  phaseB1: PhaseB1Output,
  phaseB2: PhaseB2Output
): Promise<void> {
  for (const chapterPlan of phaseB1.chapters) {
    const { data: chapter, error: chapterError } = await supabase
      .from('compiled_chapters')
      .insert({
        compilation_id: compilationId,
        order_index: (chapterPlan.chapter_index + 1) * 1000,
        title: chapterPlan.title
      })
      .select()
      .single()
    
    if (chapterError) throw chapterError
    
    const chapterParagraphs = phaseB2.paragraphs.filter(
      p => p.chapter_index === chapterPlan.chapter_index
    )
    
    for (const para of chapterParagraphs) {
      const { data: paragraph, error: paraError } = await supabase
        .from('compiled_paragraphs')
        .insert({
          chapter_id: chapter.id,
          order_index: (para.paragraph_index + 1) * 1000,
          content: para.content,
          paragraph_type: para.type
        })
        .select()
        .single()
      
      if (paraError) throw paraError
      
      // 문단 source 저장
      const episodeGroups = new Map<string, string[]>()
      
      for (const episodeId of para.source_episode_ids) {
        if (!episodeGroups.has(episodeId)) {
          episodeGroups.set(episodeId, [])
        }
      }
      
      for (const msgId of para.source_message_ids) {
        for (const episodeId of para.source_episode_ids) {
          const group = episodeGroups.get(episodeId)
          if (group && !group.includes(msgId)) {
            group.push(msgId)
          }
        }
      }
      
      for (const [episodeId, messageIds] of episodeGroups) {
        const { error: sourceError } = await supabase
          .from('compiled_paragraph_sources')
          .insert({
            paragraph_id: paragraph.id,
            episode_id: episodeId,
            message_ids: messageIds
          })
        
        if (sourceError) throw sourceError
      }
    }
  }
}

function buildResultMeta(
  phaseB1: PhaseB1Output,
  phaseB2: PhaseB2Output,
  phaseC: PhaseCOutput
) {
  const allSourceMessageIds = new Set<string>()
  const allSourceEpisodeIds = new Set<string>()
  
  for (const para of phaseB2.paragraphs) {
    para.source_message_ids.forEach(id => allSourceMessageIds.add(id))
    para.source_episode_ids.forEach(id => allSourceEpisodeIds.add(id))
  }
  
  return {
    book_meta: phaseC.meta,
    stats: {
      chapter_count: phaseB1.chapters.length,
      paragraph_count: phaseB2.paragraphs.length,
      grounded_paragraph_count: phaseB1.grounded_count,
      source_episode_count: allSourceEpisodeIds.size,
      source_message_count: allSourceMessageIds.size
    },
    warnings: phaseC.warnings,
    token_usage: {
      phase_a: 0,
      phase_b1: 0,
      phase_b2: phaseB2.token_usage.total_tokens,
      phase_c: 0,
      total: phaseB2.token_usage.total_tokens,
      estimated_cost_usd: '0.00'
    }
  }
}

// 기존 runCompile 함수는 호환성을 위해 유지 (deprecated)
export async function runCompile(params: {
  sessionId: string
  intent: CompilationIntent
  options?: Partial<CompileOptions>
  idempotencyKey?: string
}) {
  console.warn('[DOTTING] runCompile is deprecated, use POST /api/ai/book/compile instead')
  // 이 함수는 더 이상 직접 호출하지 않음
  return { success: false, error: { code: 'DEPRECATED', message: 'Use POST API instead' } }
}
