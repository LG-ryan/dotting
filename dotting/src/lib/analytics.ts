import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// 서버 전용 Supabase 클라이언트 (service_role)
// 로컬 개발 환경에서는 service_role 키가 없을 수 있음 → analytics 비활성화
let supabaseAdmin: SupabaseClient | null = null

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// 토큰 해시 생성 (HMAC-SHA256)
export function hashToken(token: string): string {
  const secret = process.env.TOKEN_HASH_SECRET || 'dotting-default-secret'
  return crypto.createHmac('sha256', secret).update(token).digest('hex')
}

// ============================================
// 이벤트 타입 정의
// ============================================
export type EventName =
  // 퍼널 이벤트 (A: 완주율)
  | 'first_answer_submitted'
  | 'preview_generated'
  | 'final_generated'
  | 'review_status_changed'
  // 품질 이벤트 (B: 수정률)
  | 'message_edited'
  | 'paragraph_edited'
  | 'fallback_question_used'
  // Interview OS 이벤트
  | 'question_generated'
  | 'answer_received'
  | 'short_answer_followup'
  // 기타
  | 'session_created'
  | 'share_link_generated'

export type ActorType = 'user' | 'respondent' | 'system' | 'admin'

interface LogEventParams {
  sessionId?: string
  userId?: string           // 자녀 (로그인 사용자)
  respondentToken?: string  // 응답자 (토큰 사용자) - 해시로 변환됨
  actorType: ActorType
  eventName: EventName
  eventData: Record<string, unknown>
}

// ============================================
// 이벤트 로깅 함수 (서버 전용)
// ============================================
export async function logEvent(params: LogEventParams): Promise<void> {
  // analytics가 비활성화된 경우 (service_role 키 없음) → 무시
  if (!supabaseAdmin) {
    return
  }

  const {
    sessionId,
    userId,
    respondentToken,
    actorType,
    eventName,
    eventData,
  } = params

  try {
    const { error } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        session_id: sessionId || null,
        user_id: userId || null,
        respondent_token_hash: respondentToken ? hashToken(respondentToken) : null,
        actor_type: actorType,
        event_name: eventName,
        event_data: eventData,
      })

    if (error) {
      console.error('[Analytics] Failed to log event:', error)
    }
  } catch (err) {
    // 이벤트 로깅 실패는 메인 플로우를 막지 않음
    console.error('[Analytics] Exception logging event:', err)
  }
}

// ============================================
// 편의 함수들
// ============================================

// 퍼널: 첫 답변 제출
export async function logFirstAnswer(sessionId: string, userId?: string, respondentToken?: string) {
  await logEvent({
    sessionId,
    userId,
    respondentToken,
    actorType: userId ? 'user' : 'respondent',
    eventName: 'first_answer_submitted',
    eventData: { timestamp: new Date().toISOString() },
  })
}

// 퍼널: 미리보기 생성
export async function logPreviewGenerated(sessionId: string, userId: string, draftId: string) {
  await logEvent({
    sessionId,
    userId,
    actorType: 'user',
    eventName: 'preview_generated',
    eventData: { draft_id: draftId },
  })
}

// 퍼널: 최종 생성
export async function logFinalGenerated(sessionId: string, userId: string, compilationId: string) {
  await logEvent({
    sessionId,
    userId,
    actorType: 'user',
    eventName: 'final_generated',
    eventData: { compilation_id: compilationId },
  })
}

// 퍼널: 리뷰 상태 변경
export async function logReviewStatusChanged(
  sessionId: string,
  userId: string,
  compilationId: string,
  fromStatus: string,
  toStatus: string
) {
  await logEvent({
    sessionId,
    userId,
    actorType: 'user',
    eventName: 'review_status_changed',
    eventData: {
      compilation_id: compilationId,
      from_status: fromStatus,
      to_status: toStatus,
    },
  })
}

// 품질: 메시지 수정
export async function logMessageEdited(
  sessionId: string,
  messageId: string,
  userId?: string,
  respondentToken?: string,
  editData?: {
    before_length?: number
    after_length?: number
    edit_type?: 'edit' | 'delete'
  }
) {
  await logEvent({
    sessionId,
    userId,
    respondentToken,
    actorType: userId ? 'user' : 'respondent',
    eventName: 'message_edited',
    eventData: {
      message_id: messageId,
      ...editData,
    },
  })
}

// 품질: 문단 수정
export async function logParagraphEdited(
  sessionId: string,
  userId: string,
  paragraphId: string,
  editData: {
    before_length: number
    after_length: number
    chapter_index?: number
    paragraph_index?: number
  }
) {
  await logEvent({
    sessionId,
    userId,
    actorType: 'user',
    eventName: 'paragraph_edited',
    eventData: {
      paragraph_id: paragraphId,
      edit_length_delta: editData.after_length - editData.before_length,
      ...editData,
    },
  })
}

// 품질: Fallback 질문 사용
export async function logFallbackQuestionUsed(
  sessionId: string,
  reason?: string,
  respondentToken?: string
) {
  await logEvent({
    sessionId,
    respondentToken,
    actorType: respondentToken ? 'respondent' : 'system',
    eventName: 'fallback_question_used',
    eventData: {
      reason: reason || 'unknown',
    },
  })
}

// Interview OS: 질문 생성
export async function logQuestionGenerated(
  sessionId: string,
  questionData: {
    question_type: 'heavy' | 'medium' | 'light'
    target_slot: 'scene' | 'turning_point' | 'relationship'
    fatigue_score: number
    is_fallback: boolean
  }
) {
  await logEvent({
    sessionId,
    actorType: 'system',
    eventName: 'question_generated',
    eventData: questionData,
  })
}

// Interview OS: 답변 수신
export async function logAnswerReceived(
  sessionId: string,
  answerData: {
    message_id: string
    content_length: number
    is_short: boolean
    short_answer_count: number
  },
  respondentToken?: string
) {
  await logEvent({
    sessionId,
    respondentToken,
    actorType: respondentToken ? 'respondent' : 'user',
    eventName: 'answer_received',
    eventData: answerData,
  })
}
