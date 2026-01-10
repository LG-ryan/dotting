import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Message {
  role: 'ai' | 'user'
  content: string
  order_index?: number
  id?: string
}

interface PreviewRequest {
  sessionId: string
  subjectName: string
  subjectRelation: string
  messages: Message[]
  feedback?: string
  styleOptions?: {
    tone?: 'warm' | 'calm' | 'vivid'
    emphasis?: 'family' | 'scenery' | 'emotion'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PreviewRequest = await request.json()
    const { sessionId, subjectName, subjectRelation, messages, feedback, styleOptions } = body

    // 사용자 답변만 추출
    const userAnswers = messages.filter(m => m.role === 'user')
    
    if (userAnswers.length < 3) {
      return NextResponse.json(
        { error: '최소 3개 이상의 답변이 필요합니다' },
        { status: 400 }
      )
    }

    // 질문-답변 쌍으로 구성
    const qaHistory = messages.reduce((acc, msg, idx) => {
      if (msg.role === 'ai') {
        const nextMsg = messages[idx + 1]
        if (nextMsg && nextMsg.role === 'user') {
          acc.push({ 
            question: msg.content, 
            answer: nextMsg.content,
            answerIndex: nextMsg.order_index ?? idx + 1
          })
        }
      }
      return acc
    }, [] as { question: string; answer: string; answerIndex: number }[])

    // 스타일 옵션 텍스트 생성
    let styleGuide = ''
    if (styleOptions?.tone) {
      const toneMap = {
        warm: '따뜻하고 포근한 톤으로, 가족의 온기가 느껴지도록',
        calm: '담담하고 차분한 톤으로, 세월의 깊이가 느껴지도록',
        vivid: '생생하고 현장감 있는 톤으로, 그 순간에 있는 것처럼'
      }
      styleGuide += `\n문체: ${toneMap[styleOptions.tone]}`
    }
    if (styleOptions?.emphasis) {
      const emphasisMap = {
        family: '가족 간의 사랑과 유대감을 특히 강조해주세요',
        scenery: '그 시절의 풍경과 분위기 묘사를 풍부하게 해주세요',
        emotion: '감정의 깊이와 내면의 변화를 섬세하게 담아주세요'
      }
      styleGuide += `\n강조점: ${emphasisMap[styleOptions.emphasis]}`
    }

    // 피드백 반영
    let feedbackGuide = ''
    if (feedback) {
      feedbackGuide = `\n\n[사용자 피드백 - 반드시 반영하세요]\n${feedback}`
    }

    // 시스템 프롬프트 (미리보기용 - 1챕터만)
    const systemPrompt = `당신은 가족의 소중한 이야기를 따뜻한 회고록으로 재탄생시키는 작가입니다.

## 대상자 정보
- 이름: ${subjectName}
- 관계: ${subjectRelation}

## 핵심 역할: "정리"가 아닌 "문학적 재구성"

당신의 역할은 인터뷰 답변을 그대로 옮기는 것이 아닙니다.
${subjectName}님의 이야기를 바탕으로, 마치 프로 작가가 쓴 것 같은 감동적인 회고록을 새로 써주세요.

## 작성 원칙

1. **1인칭 내레이션 추가**
   - 단순 사실 나열 ❌
   - "그때를 생각하면..." "돌이켜보면..." 같은 회고적 문장 추가 ✅
   - 시간의 흐름을 느끼게 하는 문장 ✅

2. **감정과 분위기를 풍부하게**
   - "우물에 빠졌다" → "차가운 물이 온몸을 감싸는 순간, 세상이 멈춘 것 같았다"
   - 오감(시각, 청각, 촉각, 후각)을 활용한 묘사
   - 그때의 공기, 빛, 소리를 상상해서 추가

3. **서사적 연결고리**
   - 인생의 흐름이 느껴지도록

4. **핵심 표현 보존**
   - 응답자가 쓴 독특한 표현, 말투는 그대로 살리기

5. **회고록 문체**
   - 담담하면서도 따뜻한 톤
   - 지나간 시간에 대한 그리움이 느껴지도록
${styleGuide}

## ⚠️ 중요: 환각 방지

- 인터뷰에 없는 사건, 인물, 장소를 새로 만들어내지 마세요.
- 묘사는 확장해도 되지만, "사건 자체"는 반드시 답변에서 나온 것만 사용하세요.
- 불확실한 경우, 과장보다 담담함을 선택하세요.
- 응답자가 언급하지 않은 감정을 임의로 부여하지 마세요.
- 답변에 없는 감정의 강도(예: "인생에서 가장", "극도로", "평생 잊지 못할" 등)는 임의로 강화하지 마세요.
${feedbackGuide}

## 출력 형식 (미리보기 - 1챕터만)

---CHAPTER---
제목: [감성적이고 문학적인 챕터 제목]
---CONTENT---
[500-800자의 문학적 회고록 형식 글]
---END---`

    const qaText = qaHistory.slice(0, 5).map((qa, i) => 
      `질문 ${i + 1}: ${qa.question}\n답변 ${i + 1}: ${qa.answer}`
    ).join('\n\n')

    const userPrompt = `아래는 ${subjectName}님(${subjectRelation})과의 인터뷰 내용 일부입니다.

${qaText}

---

위 인터뷰의 초반부를 바탕으로 **첫 번째 챕터**를 작성해주세요.
이 챕터는 주로 어린 시절이나 성장 배경을 다룹니다.

⚠️ 중요: 이 챕터에서는 인터뷰 초반에 언급된 사건과 시기만 사용하세요.
후반 인생이나 현재 시점의 이야기는 포함하지 마세요.

기억하세요: "정리"가 아니라 "문학적 재탄생"입니다.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    })

    const content = response.choices[0].message.content?.trim() || ''

    // 토큰 사용량 로깅
    const usage = response.usage
    console.log('[DOTTING] Preview Token Usage:', {
      prompt_tokens: usage?.prompt_tokens,
      completion_tokens: usage?.completion_tokens,
      total_tokens: usage?.total_tokens,
      estimated_cost_usd: usage ? (
        (usage.prompt_tokens * 0.0025 / 1000) + 
        (usage.completion_tokens * 0.01 / 1000)
      ).toFixed(4) : 'N/A'
    })

    // 챕터 파싱
    const chapter = parsePreviewChapter(content)

    if (!chapter) {
      return NextResponse.json(
        { error: '미리보기 생성에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    // 사용된 QA 인덱스 (source tracking)
    const sourceIndices = qaHistory.slice(0, 5).map(qa => qa.answerIndex)

    // DB에 미리보기 저장
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component에서 호출된 경우 무시
            }
          },
        },
      }
    )

    // fingerprint 계산 (마지막 메시지 ID + 메시지 개수)
    const lastMessage = messages[messages.length - 1]
    const fingerprintMessageId = lastMessage?.id || null
    const fingerprintMessageCount = messages.length

    // 기존 preview가 있으면 업데이트, 없으면 생성
    const { data: existingDraft } = await supabase
      .from('output_drafts')
      .select('id, regeneration_count')
      .eq('session_id', sessionId)
      .eq('status', 'preview')
      .single()

    let draftId: string
    let currentAttempts = 0

    if (existingDraft) {
      // 기존 preview 업데이트 (재생성)
      draftId = existingDraft.id
      currentAttempts = (existingDraft.regeneration_count || 0) + 1
      
      // 재생성 횟수 증가 + fingerprint 업데이트
      await supabase
        .from('output_drafts')
        .update({ 
          regeneration_count: currentAttempts,
          fingerprint_message_id: fingerprintMessageId,
          fingerprint_message_count: fingerprintMessageCount,
        })
        .eq('id', draftId)
      
      // 기존 챕터 삭제
      await supabase
        .from('chapters')
        .delete()
        .eq('output_draft_id', draftId)
    } else {
      // 새 preview 생성 (첫 생성)
      const { data: newDraft, error: draftError } = await supabase
        .from('output_drafts')
        .insert({
          session_id: sessionId,
          title: `${subjectName}님의 이야기`,
          status: 'preview',
          regeneration_count: 0,
          fingerprint_message_id: fingerprintMessageId,
          fingerprint_message_count: fingerprintMessageCount,
        })
        .select()
        .single()

      if (draftError || !newDraft) {
        console.error('[DOTTING] Preview draft creation error:', draftError)
        return NextResponse.json(
          { error: '미리보기 저장에 실패했습니다' },
          { status: 500 }
        )
      }
      
      draftId = newDraft.id
      currentAttempts = 0
    }

    // 미리보기 챕터 저장
    await supabase
      .from('chapters')
      .insert({
        output_draft_id: draftId,
        order_index: 0,
        title: chapter.title,
        content: chapter.content,
        source_message_ids: [],
      })

    return NextResponse.json({ 
      success: true,
      draftId,
      chapter,
      attempts: currentAttempts,
      sourceIndices,
      usage: {
        prompt_tokens: usage?.prompt_tokens,
        completion_tokens: usage?.completion_tokens,
        total_tokens: usage?.total_tokens,
      }
    })

  } catch (error) {
    console.error('[DOTTING] Preview generation error:', error)
    return NextResponse.json(
      { error: '미리보기 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

function parsePreviewChapter(content: string): { title: string; content: string } | null {
  const titleMatch = content.match(/제목:\s*([^\n]+?)(?:\n|---CONTENT---)/)
  const contentMatch = content.match(/---CONTENT---\s*([\s\S]*?)(?:---END---|$)/)
  
  if (titleMatch && contentMatch) {
    const title = titleMatch[1].trim()
    const chapterContent = contentMatch[1].trim()
    
    // 최소 품질 검증
    if (chapterContent.length < 200) {
      return null
    }
    
    return { title, content: chapterContent }
  }
  
  return null
}
