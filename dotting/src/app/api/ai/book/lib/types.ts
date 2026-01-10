/**
 * DOTTING Book Compile API - 공통 타입 정의
 * 
 * MASTER 원칙:
 * - 과감한 삭제 (aggressiveCut)
 * - 근거 강제 (grounded 문단은 source 필수)
 * - 단순 병합 금지 (에피소드 내용 그대로 붙이기 금지)
 * - 편집자 모드 (AI가 작가처럼 재구성)
 */

import type { 
  EpisodeInclusion, 
  EpisodeTheme, 
  ParagraphType,
  CompilationIntent,
  CompilationStatus,
  Json
} from '@/types/database'

// ============================================
// Phase A: Episode Selection Types
// ============================================

export interface EpisodeForSelection {
  id: string
  order_index: number
  title: string | null
  theme: EpisodeTheme
  time_period: string | null
  source_message_ids: string[]
  summary: string
  content: string | null
  emotional_weight: number
  has_turning_point: boolean
  has_reflection: boolean
}

export interface EpisodeSelectionSignals {
  emotional_weight: number
  has_turning_point: boolean
  has_reflection: boolean
  redundancy_score: number      // 0-10: 다른 에피소드와 중복 정도
  bridge_needed: boolean        // 다음 에피소드와 연결 문장 필요 여부
  narrative_value: number       // 0-10: 서사적 가치
}

export interface EpisodeSelectionResult {
  episode_id: string
  inclusion_status: EpisodeInclusion
  decision_reason: string       // 사람이 읽을 수 있는 짧은 문장
  signals: EpisodeSelectionSignals
}

export interface PhaseAOutput {
  selections: EpisodeSelectionResult[]
  core_count: number
  supporting_count: number
  excluded_count: number
}

// ============================================
// Phase B1: Citation Plan Types
// ============================================

export interface ParagraphPlan {
  chapter_index: number         // 0-based
  paragraph_index: number       // 0-based within chapter
  type: ParagraphType           // grounded | connector | editorial | intro | outro
  purpose: string               // 이 문단의 목적 (한 문장)
  used_episode_ids: string[]    // 참조할 에피소드 ID들
  source_message_ids: string[]  // 참조할 메시지 ID들 (grounded는 필수 1개 이상)
}

export interface ChapterPlan {
  chapter_index: number
  title: string
  theme_focus: string           // 이 챕터가 다루는 주요 주제
  time_range: string            // 시간 범위 (예: "1970년대 ~ 1980년대 초반")
  paragraph_plans: ParagraphPlan[]
}

export interface PhaseB1Output {
  chapters: ChapterPlan[]
  total_paragraphs: number
  grounded_count: number
  connector_count: number
  intro_outro_count: number
}

// ============================================
// Phase B2: Paragraph Writing Types
// ============================================

export interface WrittenParagraph {
  chapter_index: number
  paragraph_index: number
  type: ParagraphType
  content: string
  source_episode_ids: string[]
  source_message_ids: string[]
}

export interface PhaseB2Output {
  paragraphs: WrittenParagraph[]
  token_usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ============================================
// Phase C: Meta Generation Types
// ============================================

export interface BookMeta {
  title: string
  subtitle: string | null
  preface: string | null        // 서문
  epilogue: string | null       // 마무리
  preface_sources: string[]     // 서문 근거 (final 권장)
  epilogue_sources: string[]    // 마무리 근거 (final 권장)
}

export interface PhaseCOutput {
  meta: BookMeta
  warnings: string[]            // "intro has no sources" 등
}

// ============================================
// Compile Options & Results
// ============================================

export interface CompileOptions {
  // 희망치 (강제 아님)
  chapterCountMin: number       // default: 3
  chapterCountMax: number       // default: 5
  paragraphsPerChapterMin: number  // default: 2
  paragraphsPerChapterMax: number  // default: 8
  
  // 강제 옵션
  structureMode: 'timeline' | 'thematic' | 'freeform'  // default: timeline
  aggressiveCut: boolean        // default: true
  reflectionPlacement: 'late' | 'distributed'  // default: late
  allowAppendix: boolean        // preview만 true 가능
  
  // 편집 지시
  editorNotes: string | null
}

export const DEFAULT_COMPILE_OPTIONS: CompileOptions = {
  chapterCountMin: 3,
  chapterCountMax: 5,
  paragraphsPerChapterMin: 2,
  paragraphsPerChapterMax: 8,
  structureMode: 'timeline',
  aggressiveCut: true,
  reflectionPlacement: 'late',
  allowAppendix: false,
  editorNotes: null
}

export interface CompileResult {
  compilation_id: string
  version: number
  status: CompilationStatus
  result_meta: {
    book_meta: BookMeta
    stats: {
      chapter_count: number
      paragraph_count: number
      grounded_paragraph_count: number
      source_episode_count: number
      source_message_count: number
    }
    warnings: string[]
    token_usage: {
      phase_a: number
      phase_b1: number
      phase_b2: number
      phase_c: number
      total: number
      estimated_cost_usd: string
    }
  } | null
  error_message: string | null
}

// ============================================
// Compile Runner Context
// ============================================

export interface CompileContext {
  compilation_id: string
  session_id: string
  intent: CompilationIntent
  options: CompileOptions
  
  // 중간 결과 (Phase 간 전달)
  phaseA?: PhaseAOutput
  phaseB1?: PhaseB1Output
  phaseB2?: PhaseB2Output
  phaseC?: PhaseCOutput
}

// ============================================
// Progress Types (비동기 처리용)
// ============================================

export type CompilePhase = 'A' | 'B1' | 'B2' | 'C'

export interface CompileProgress {
  phase: CompilePhase | null
  percent: 0 | 25 | 50 | 75 | 100
  message: string | null
  updated_at: string | null
}

export const PHASE_MESSAGES: Record<CompilePhase, string> = {
  'A': '에피소드를 분석하고 있어요...',
  'B1': '챕터를 구성하고 있어요...',
  'B2': '이야기를 작성하고 있어요...',
  'C': '마무리하고 있어요...'
}

export const PHASE_PERCENT: Record<CompilePhase, 0 | 25 | 50 | 75> = {
  'A': 0,
  'B1': 25,
  'B2': 50,
  'C': 75
}

// ============================================
// Error Codes (세분화)
// ============================================

export const COMPILE_ERROR_CODES = {
  // 사용자 유도 필요 (재시도 가치 없음)
  NO_EPISODES: 'NO_EPISODES',
  NO_CORE_EPISODES: 'NO_CORE_EPISODES',
  
  // 근거 관련 (내부 경고 필수 - 파이프라인 버그 가능성)
  GROUNDED_WITHOUT_SOURCE: 'GROUNDED_WITHOUT_SOURCE',
  SOURCE_OUT_OF_PLAN: 'SOURCE_OUT_OF_PLAN',
  GROUNDING_TRIGGER_FAILED: 'GROUNDING_TRIGGER_FAILED',
  
  // 시스템 관련 (재시도 가치 있음)
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  LLM_ERROR: 'LLM_ERROR',
  DB_ERROR: 'DB_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type CompileErrorCode = typeof COMPILE_ERROR_CODES[keyof typeof COMPILE_ERROR_CODES]

// 에러 코드별 UX 매핑
export const ERROR_UX_CONFIG: Record<CompileErrorCode, {
  message: string
  buttonText: string
  buttonAction: 'retry' | 'interview' | 'start'
  internalAlert: boolean
}> = {
  NO_EPISODES: {
    message: '아직 나눈 이야기가 없어요. 먼저 이야기를 시작해주세요.',
    buttonText: '이야기 시작하기',
    buttonAction: 'start',
    internalAlert: false
  },
  NO_CORE_EPISODES: {
    message: '책을 엮기엔 이야기가 조금 짧아요. 몇 가지 질문에 더 답해주시면 멋진 책이 될 거예요.',
    buttonText: '이야기 더 나누기',
    buttonAction: 'interview',
    internalAlert: false
  },
  GROUNDED_WITHOUT_SOURCE: {
    message: '책의 일부 문장에서 근거 연결이 충분하지 않았어요. 안정적으로 책을 만들기 위해, 잠시 후 다시 시도해주세요.',
    buttonText: '다시 시도',
    buttonAction: 'retry',
    internalAlert: true  // 파이프라인 버그 가능성
  },
  SOURCE_OUT_OF_PLAN: {
    message: '책의 일부 문장에서 근거 연결이 충분하지 않았어요. 안정적으로 책을 만들기 위해, 잠시 후 다시 시도해주세요.',
    buttonText: '다시 시도',
    buttonAction: 'retry',
    internalAlert: true
  },
  GROUNDING_TRIGGER_FAILED: {
    message: '책 마무리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
    buttonText: '다시 시도',
    buttonAction: 'retry',
    internalAlert: true
  },
  LLM_TIMEOUT: {
    message: '잠시 연결이 불안정했어요. 다시 시도해주세요.',
    buttonText: '다시 시도',
    buttonAction: 'retry',
    internalAlert: false
  },
  LLM_ERROR: {
    message: '일시적인 문제가 발생했어요. 다시 시도해주세요.',
    buttonText: '다시 시도',
    buttonAction: 'retry',
    internalAlert: false
  },
  DB_ERROR: {
    message: '저장 중 문제가 생겼어요. 다시 시도해주세요.',
    buttonText: '다시 시도',
    buttonAction: 'retry',
    internalAlert: true
  },
  INTERNAL_ERROR: {
    message: '예상치 못한 문제가 발생했어요. 다시 시도해주세요.',
    buttonText: '다시 시도',
    buttonAction: 'retry',
    internalAlert: true
  }
}
