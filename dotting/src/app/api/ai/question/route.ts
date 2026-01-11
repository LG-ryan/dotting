import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { 
  InterviewState, 
  DEFAULT_INTERVIEW_STATE,
  getQuestionContext,
  buildInterviewOSPrompt,
  classifyQuestionType,
  processQuestionGenerated,
  isShortAnswer,
} from '@/lib/interview-os'
import { logQuestionGenerated, logFallbackQuestionUsed } from '@/lib/analytics'
import { requirePayment } from '@/lib/payment-gate'
import { FREE_QUESTIONS_LIMIT, LIMIT_MESSAGES, PAID_ORDER_STATUSES } from '@/lib/free-tier-limits'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 세션 소유권 확인 + AI 질문 수 조회
async function verifySessionAndGetCount(
  sessionId: string, 
  userId: string
): Promise<{ authorized: boolean; questionCount: number }> {
  const supabase = await createClient()
  
  // 세션 소유권 확인
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()
  
  if (!session || session.user_id !== userId) {
    return { authorized: false, questionCount: 0 }
  }
  
  // AI 질문 수 조회
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('role', 'ai')
    .is('deleted_at', null)
  
  return { authorized: true, questionCount: count || 0 }
}

// 결제 완료된 세션인지 확인
async function isPaidSession(sessionId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .in('status', [...PAID_ORDER_STATUSES])
    .limit(1)
    .single()
  
  return !!order
}

interface Message {
  role: 'ai' | 'user'
  content: string
}

interface QuestionRequest {
  sessionId: string
  subjectName: string
  subjectRelation: string
  messages: Message[]
  isFirst: boolean
}

// 세션에서 interview_state 가져오기
async function getInterviewState(sessionId: string): Promise<InterviewState> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sessions')
    .select('interview_state')
    .eq('id', sessionId)
    .single()
  
  return (data?.interview_state as unknown as InterviewState) || DEFAULT_INTERVIEW_STATE
}

// 세션의 interview_state 업데이트
async function updateInterviewState(sessionId: string, state: InterviewState): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('sessions')
    .update({ interview_state: JSON.parse(JSON.stringify(state)) })
    .eq('id', sessionId)
}

export async function POST(request: NextRequest) {
  try {
    const body: QuestionRequest = await request.json()
    const { sessionId, subjectName, subjectRelation, messages, isFirst } = body
    
    // 0. 인증 확인
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    // 1. 세션 소유권 확인 + 질문 카운트 조회
    // 보안: 404로 통일하여 세션 존재 여부 힌트 최소화
    const { authorized, questionCount } = await verifySessionAndGetCount(sessionId, user.id)
    if (!authorized) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 2. 무료 질문 제한 체크 (결제 안 한 세션만)
    const isPaid = await isPaidSession(sessionId)
    if (!isPaid) {
      if (questionCount >= FREE_QUESTIONS_LIMIT) {
        return NextResponse.json({
          error: 'FREE_LIMIT_EXCEEDED',
          message: LIMIT_MESSAGES.questions.description,
          title: LIMIT_MESSAGES.questions.title,
          cta: LIMIT_MESSAGES.questions.cta,
          current_count: questionCount,
          limit: FREE_QUESTIONS_LIMIT,
        }, { status: 402 }) // 402 Payment Required
      }
    }
    
    // 3. 결제 게이트: paid 상태가 아니면 LLM 호출 차단 (기존 로직 - 로컬에서는 우회됨)
    const paymentGate = await requirePayment(sessionId)
    if (!paymentGate.allowed) {
      return paymentGate.response
    }
    
    // 테스트 모드: fallback 강제 발생 (개발용)
    const url = new URL(request.url)
    if (url.searchParams.get('test_fallback') === 'true') {
      throw new Error('Test fallback mode')
    }
    
    // Interview OS: 현재 상태 가져오기
    const interviewState = await getInterviewState(sessionId)
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]
    const context = getQuestionContext(interviewState, lastUserMessage?.content)
    
    // Interview OS 프롬프트 힌트 생성
    const interviewOSHint = buildInterviewOSPrompt(context)

    // 시스템 프롬프트 (Interview OS 통합)
    const systemPrompt = `당신은 가족의 소중한 이야기를 기록하는 따뜻한 인터뷰어입니다.

대상자 정보:
- 이름: ${subjectName}
- 관계: ${subjectRelation}

역할:
1. 대상자의 인생 이야기를 자연스럽게 이끌어내는 질문을 합니다.
2. 이전 답변을 바탕으로 더 깊이 있는 꼬리 질문을 합니다.
3. 감정적인 순간을 포착하면 그 부분을 더 탐구합니다.
4. 질문은 한 번에 하나씩만 합니다.
5. 존댓말을 사용하고 따뜻하고 편안한 톤을 유지합니다.

${interviewOSHint}

질문 주제 (순서대로 자연스럽게 진행):
1. 어린 시절과 성장 배경
2. 가족 이야기
3. 학창 시절 추억
4. 직업과 커리어
5. 결혼과 가정
6. 자녀 양육
7. 인생의 전환점
8. 가장 행복했던 순간
9. 어려웠던 시기와 극복
10. 후회와 교훈
11. 미래 세대에게 전하고 싶은 말

주의사항:
- 너무 무겁거나 불편한 질문은 피합니다
- 답변이 짧으면 구체적인 예시를 요청합니다
- 감정이 담긴 답변에는 공감을 표현한 후 후속 질문을 합니다
- "네", "아니오"로 끝나는 질문은 피합니다`

    // 첫 질문인 경우
    if (isFirst) {
      const firstQuestionPrompt = `${subjectName}님(${subjectRelation})의 이야기를 처음 시작합니다.

먼저 따뜻한 인사로 시작하고, 이어서 첫 질문을 해주세요.
- 인사는 "${subjectName}님"을 부르며 편안하게 시작하세요
- 예시: "안녕하세요, ${subjectName}님! 오늘 함께 이야기 나눌 수 있어서 정말 기뻐요. 천천히 편하게 말씀해 주세요."
- 인사 후 한 줄 띄우고, 어린 시절이나 성장 배경에 대한 편안한 첫 질문을 해주세요
- 너무 무겁지 않게 시작해주세요

인사와 질문을 함께 출력하세요.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: firstQuestionPrompt },
        ],
        max_tokens: 200,
        temperature: 0.8,
      })

      const question = response.choices[0].message.content?.trim() || ''
      
      // Interview OS: 질문 타입 분류 및 상태 업데이트
      // 첫 질문은 항상 light로 시작
      const questionType = classifyQuestionType(question, true)
      const newState = processQuestionGenerated(interviewState, questionType)
      await updateInterviewState(sessionId, newState)
      
      // 이벤트 로깅
      await logQuestionGenerated(sessionId, {
        question_type: questionType,
        target_slot: context.targetSlot,
        fatigue_score: newState.fatigue_score,
        is_fallback: false,
      })

      return NextResponse.json({ question })
    }

    // 이전 대화 기반 후속 질문
    const conversationHistory = messages.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    })) as { role: 'assistant' | 'user'; content: string }[]

    // lastUserMessage는 73행에서 이미 정의됨

    const followUpPrompt = `방금 ${subjectName}님이 다음과 같이 답변하셨습니다:
"${lastUserMessage?.content}"

이 답변을 바탕으로:
1. 답변에 감정이나 중요한 순간이 담겨있다면 그 부분을 더 깊이 탐구하는 꼬리 질문을 하세요.
2. 답변이 짧다면 구체적인 상황이나 감정을 물어보세요.
3. 충분히 탐구했다면 자연스럽게 다음 주제로 넘어가세요.

질문만 출력하세요.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: followUpPrompt },
      ],
      max_tokens: 200,
      temperature: 0.8,
    })

    const question = response.choices[0].message.content?.trim() || ''
    
    // Interview OS: 질문 타입 분류 및 상태 업데이트
    // forceLight: 피로도 초과 또는 짧은 답변 follow-up 시 light 강제
    const questionType = classifyQuestionType(question, context.forceLight)
    const newState = processQuestionGenerated(interviewState, questionType)
    await updateInterviewState(sessionId, newState)
    
    // 이벤트 로깅
    await logQuestionGenerated(sessionId, {
      question_type: questionType,
      target_slot: context.targetSlot,
      fatigue_score: newState.fatigue_score,
      is_fallback: false,
    })

    return NextResponse.json({ question })

  } catch (error) {
    console.error('Question generation error:', error)
    
    // Fallback 질문 (LLM 실패 시에도 대화 중단 방지)
    // 안전 + 자연 + 부담 낮음 기준으로 선정
    const fallbackQuestions = [
      '그때의 기분이 어떠셨어요?',
      '그 일이 있은 후에는 어떻게 되셨나요?',
      '그때 주변 분들은 어떤 반응이셨어요?',
      '그 경험이 지금의 삶에 어떤 영향을 주었나요?',
      '그 시절에 가장 기억에 남는 장면이 있으신가요?',
      '그때 가장 가까이 계셨던 분은 누구였나요?',
      '지금 생각하면 그때가 어떻게 느껴지세요?',
    ]
    
    const fallbackQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]
    
    // 로깅 (품질 개선/모니터링용)
    const errorReason = error instanceof Error ? error.message : 'Unknown'
    console.warn('[DOTTING] Fallback question used:', {
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorMessage: errorReason,
      timestamp: new Date().toISOString(),
    })
    
    // 이벤트 로깅 (세션 ID는 catch 블록에서 접근 불가할 수 있음)
    try {
      const body = await request.clone().json()
      if (body.sessionId) {
        await logFallbackQuestionUsed(body.sessionId, errorReason)
      }
    } catch {
      // 로깅 실패는 무시
    }
    
    return NextResponse.json({ 
      question: fallbackQuestion,
      is_fallback: true,
      error_message: 'AI 질문 생성에 실패하여 기본 질문을 보여드려요.'
    })
  }
}
