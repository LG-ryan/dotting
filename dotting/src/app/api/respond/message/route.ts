import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  InterviewState, 
  DEFAULT_INTERVIEW_STATE,
  isShortAnswer,
  processAnswer,
} from '@/lib/interview-os'
import { logAnswerReceived, logFirstAnswer } from '@/lib/analytics'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 세션에서 interview_state 가져오기 (service_role)
async function getInterviewState(sessionId: string): Promise<InterviewState> {
  const { data } = await supabaseAdmin
    .from('sessions')
    .select('interview_state')
    .eq('id', sessionId)
    .single()
  
  return data?.interview_state || DEFAULT_INTERVIEW_STATE
}

// 세션의 interview_state 업데이트 (service_role)
async function updateInterviewState(sessionId: string, state: InterviewState): Promise<void> {
  await supabaseAdmin
    .from('sessions')
    .update({ interview_state: state })
    .eq('id', sessionId)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, content } = body

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.', success: false }, { status: 400 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '내용을 입력해주세요.', success: false }, { status: 400 })
    }

    // 토큰으로 세션 조회
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .rpc('get_session_by_share_token', { p_token: token })
    
    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 링크입니다.', success: false },
        { status: 401 }
      )
    }

    const session = sessionData[0]

    // 현재 메시지 수 조회
    const { data: existingMessages } = await supabaseAdmin
      .from('messages')
      .select('order_index')
      .eq('session_id', session.id)
      .is('deleted_at', null)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrderIndex = existingMessages && existingMessages.length > 0
      ? existingMessages[0].order_index + 1
      : 0

    // 사용자 메시지 저장
    const { data: savedMessage, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: content.trim(),
        input_type: 'text',
        order_index: nextOrderIndex,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to save message:', insertError)
      return NextResponse.json(
        { error: '메시지 저장에 실패했습니다.', success: false },
        { status: 500 }
      )
    }
    
    // Interview OS: 답변 처리 및 상태 업데이트
    const trimmedContent = content.trim()
    const isShort = isShortAnswer(trimmedContent)
    const interviewState = await getInterviewState(session.id)
    const newState = processAnswer(interviewState, trimmedContent)
    await updateInterviewState(session.id, newState)
    
    // 이벤트 로깅
    await logAnswerReceived(session.id, {
      message_id: savedMessage.id,
      content_length: trimmedContent.length,
      is_short: isShort,
      short_answer_count: newState.short_answer_count,
    }, token)
    
    // 첫 답변인 경우 퍼널 이벤트
    if (nextOrderIndex <= 1) {  // 첫 번째 또는 두 번째 메시지 (AI 질문 + 첫 답변)
      await logFirstAnswer(session.id, undefined, token)
    }

    return NextResponse.json({
      success: true,
      messageId: savedMessage.id,
      isShortAnswer: isShort,
      shortAnswerCount: newState.short_answer_count,
    })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: '메시지 전송에 실패했습니다.', success: false },
      { status: 500 }
    )
  }
}
