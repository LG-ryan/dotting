import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { 
  InterviewState, 
  DEFAULT_INTERVIEW_STATE,
  getQuestionContext,
  buildInterviewOSPrompt,
  classifyQuestionType,
  processQuestionGenerated,
} from '@/lib/interview-os'
import { logQuestionGenerated, logFallbackQuestionUsed } from '@/lib/analytics'
import { requirePayment } from '@/lib/payment-gate'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Fallback 질문 (LLM 실패 시)
const fallbackQuestions = [
  '그때의 기분이 어떠셨어요?',
  '그 일이 있은 후에는 어떻게 되셨나요?',
  '그때 주변 분들은 어떤 반응이셨어요?',
  '그 경험이 지금의 삶에 어떤 영향을 주었나요?',
  '그 시절에 가장 기억에 남는 장면이 있으신가요?',
  '그때 가장 가까이 계셨던 분은 누구였나요?',
  '지금 생각하면 그때가 어떻게 느껴지세요?',
]

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
    const { token, subjectName, subjectRelation, messages, isFirst } = body

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
    }

    // 토큰으로 세션 조회
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .rpc('get_session_by_share_token', { p_token: token })
    
    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 링크입니다.' },
        { status: 401 }
      )
    }

    const session = sessionData[0]
    
    // 결제 게이트: paid 상태가 아니면 LLM 호출 차단
    const paymentGate = await requirePayment(session.id, supabaseAdmin)
    if (!paymentGate.allowed) {
      return paymentGate.response
    }
    
    // Interview OS: 현재 상태 가져오기
    const interviewState = await getInterviewState(session.id)
    const lastUserMessage = messages?.filter((m: { role: string }) => m.role === 'user').slice(-1)[0]
    const context = getQuestionContext(interviewState, lastUserMessage?.content)
    
    // Interview OS 프롬프트 힌트 생성
    const interviewOSHint = buildInterviewOSPrompt(context)

    let question: string
    let isFallback = false
    let errorMessage: string | undefined
    let questionType: 'heavy' | 'medium' | 'light' = 'medium'

    try {
      // OpenAI로 질문 생성 (Interview OS 통합)
      const systemPrompt = isFirst
        ? `당신은 따뜻하고 공감적인 인터뷰어입니다. ${subjectName}님(${subjectRelation})의 삶의 이야기를 듣고 있습니다. 
           첫 질문으로 편안하게 대화를 시작할 수 있는 질문을 해주세요.
           질문은 한국어로, 존댓말로 작성하세요. 너무 길지 않게 1-2문장으로 해주세요.
           
           ${interviewOSHint}`
        : `당신은 따뜻하고 공감적인 인터뷰어입니다. ${subjectName}님(${subjectRelation})의 삶의 이야기를 듣고 있습니다.
           이전 대화를 바탕으로 자연스럽게 이어지는 후속 질문을 해주세요.
           감정을 깊이 탐구하거나, 구체적인 에피소드를 물어보세요.
           질문은 한국어로, 존댓말로 작성하세요. 너무 길지 않게 1-2문장으로 해주세요.
           
           ${interviewOSHint}`

      const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
      ]

      // 이전 대화 추가
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          chatMessages.push({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.content,
          })
        }
      }

      chatMessages.push({
        role: 'user',
        content: '다음 질문을 해주세요.',
      })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        max_tokens: 200,
        temperature: 0.8,
      })

      question = completion.choices[0]?.message?.content?.trim() || ''

      if (!question) {
        throw new Error('Empty response from OpenAI')
      }
      
      // Interview OS: 질문 타입 분류
      // forceLight: 피로도 초과 또는 짧은 답변 follow-up 시 light 강제
      questionType = classifyQuestionType(question, context.forceLight || isFirst)
    } catch (error) {
      // Fallback 질문 사용
      const errorReason = error instanceof Error ? error.message : 'Unknown'
      console.warn('[DOTTING] Respondent fallback question used:', {
        token: token.substring(0, 8) + '...',
        messageCount: messages?.length || 0,
        errorType: error instanceof Error ? error.name : 'Unknown',
        timestamp: new Date().toISOString(),
      })

      question = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]
      questionType = 'light'  // fallback은 light로 분류
      isFallback = true
      errorMessage = 'AI 질문 생성에 실패하여 기본 질문을 보여드려요.'
      
      // 이벤트 로깅
      await logFallbackQuestionUsed(session.id, errorReason, token)
    }
    
    // Interview OS: 상태 업데이트
    const newState = processQuestionGenerated(interviewState, questionType)
    await updateInterviewState(session.id, newState)
    
    // 이벤트 로깅
    await logQuestionGenerated(session.id, {
      question_type: questionType,
      target_slot: context.targetSlot,
      fatigue_score: newState.fatigue_score,
      is_fallback: isFallback,
    })

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

    // meta 정보 구성
    const meta = {
      question_source: isFallback ? 'fallback' : 'llm',
      ...(isFallback && errorMessage ? { fallback_reason: errorMessage } : {}),
    }

    // AI 질문 저장
    await supabaseAdmin
      .from('messages')
      .insert({
        session_id: session.id,
        role: 'ai',
        content: question,
        input_type: 'text',
        order_index: nextOrderIndex,
        meta,
      })

    return NextResponse.json({
      question,
      is_fallback: isFallback,
      error_message: errorMessage,
    })
  } catch (error) {
    console.error('Failed to generate question:', error)
    return NextResponse.json(
      { error: '질문 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
