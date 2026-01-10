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

interface StoryRequest {
  sessionId: string
  subjectName: string
  subjectRelation: string
  messages: Message[]
  confirmedStyle?: {
    tone?: 'warm' | 'calm' | 'vivid'
    emphasis?: 'family' | 'scenery' | 'emotion'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: StoryRequest = await request.json()
    const { sessionId, subjectName, subjectRelation, messages, confirmedStyle } = body

    // 사용자 답변만 추출
    const userAnswers = messages.filter(m => m.role === 'user')
    
    if (userAnswers.length < 5) {
      return NextResponse.json(
        { error: '최소 5개 이상의 답변이 필요합니다' },
        { status: 400 }
      )
    }

    // 질문-답변 쌍으로 구성 (source tracking 포함)
    const qaHistory = messages.reduce((acc, msg, idx) => {
      if (msg.role === 'ai') {
        const nextMsg = messages[idx + 1]
        if (nextMsg && nextMsg.role === 'user') {
          acc.push({ 
            question: msg.content, 
            answer: nextMsg.content,
            messageId: nextMsg.id,
            orderIndex: nextMsg.order_index ?? idx + 1
          })
        }
      }
      return acc
    }, [] as { question: string; answer: string; messageId?: string; orderIndex: number }[])

    // 스타일 가이드 생성
    let styleGuide = ''
    if (confirmedStyle?.tone) {
      const toneMap = {
        warm: '따뜻하고 포근한 톤으로, 가족의 온기가 느껴지도록',
        calm: '담담하고 차분한 톤으로, 세월의 깊이가 느껴지도록',
        vivid: '생생하고 현장감 있는 톤으로, 그 순간에 있는 것처럼'
      }
      styleGuide += `\n문체: ${toneMap[confirmedStyle.tone]}`
    }
    if (confirmedStyle?.emphasis) {
      const emphasisMap = {
        family: '가족 간의 사랑과 유대감을 특히 강조해주세요',
        scenery: '그 시절의 풍경과 분위기 묘사를 풍부하게 해주세요',
        emotion: '감정의 깊이와 내면의 변화를 섬세하게 담아주세요'
      }
      styleGuide += `\n강조점: ${emphasisMap[confirmedStyle.emphasis]}`
    }

    // 스토리 생성 프롬프트 (개선된 버전)
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
   - 각 챕터가 자연스럽게 이어지도록
   - "그 일이 있고 몇 년 뒤...", "그때 배운 것이 훗날..."
   - 인생의 흐름이 느껴지도록

4. **핵심 표현 보존**
   - 응답자가 쓴 독특한 표현, 말투는 그대로 살리기
   - "너무 웃겼지", "정말 많이 울었어" 같은 생생한 표현은 유지

5. **회고록 문체**
   - 마치 오랜 세월이 지난 후 인생을 돌아보며 쓴 글처럼
   - 담담하면서도 따뜻한 톤
   - 지나간 시간에 대한 그리움이 느껴지도록
${styleGuide}

## ⚠️ 중요: 환각 방지 (반드시 준수)

- 인터뷰에 없는 사건, 인물, 장소를 새로 만들어내지 마세요.
- 묘사는 확장해도 되지만, "사건 자체"는 반드시 답변에서 나온 것만 사용하세요.
- 불확실한 경우, 과장보다 담담함을 선택하세요.
- 응답자가 언급하지 않은 감정을 임의로 부여하지 마세요.
- 날짜, 나이, 장소 등 구체적 정보는 답변에 있는 것만 사용하세요.
- 답변에 없는 감정의 강도(예: "인생에서 가장", "극도로", "평생 잊지 못할" 등)는 임의로 강화하지 마세요.

## 출력 형식 (반드시 3개 챕터)

각 챕터는 반드시 아래 형식으로 작성:

---CHAPTER---
제목: [감성적이고 문학적인 챕터 제목]
소스: [이 챕터에 사용된 답변 번호들, 예: 1,2,3]
---CONTENT---
[500-800자의 문학적 회고록 형식 글]
---END---

## 챕터 구성 (반드시 3개, 시기 엄격 분리)

1. **Chapter 1**: 어린 시절과 성장 배경
   - 답변 초반부(1~33%)만 활용
   - 후반 인생 이야기 포함 금지

2. **Chapter 2**: 인생의 전환점이나 중요한 사건
   - 답변 중반부(34~66%)만 활용
   - 어린 시절이나 현재 이야기 포함 금지

3. **Chapter 3**: 현재에 이르기까지, 또는 깨달음
   - 답변 후반부(67~100%)만 활용
   - 과거 시점 이야기 반복 금지

⚠️ 각 챕터는 해당 시기의 답변만 사용하세요. 시점이 뒤섞이면 안 됩니다.
반드시 정확히 3개의 챕터를 작성하세요.`

    const qaText = qaHistory.map((qa, i) => 
      `[답변 ${i + 1}]\n질문: ${qa.question}\n답변: ${qa.answer}`
    ).join('\n\n')

    const userPrompt = `아래는 ${subjectName}님(${subjectRelation})과의 인터뷰 전체 내용입니다.

${qaText}

---

위 인터뷰를 바탕으로 ${subjectName}님의 인생 이야기를 **문학적인 회고록**으로 다시 써주세요.

요구사항:
1. 단순히 답변을 정리하지 말고, 프로 작가가 쓴 것처럼 **새로 써주세요**
2. **반드시 정확히 3개의 챕터**로 구성하세요
3. 각 챕터는 인생의 서로 다른 시기를 다루되, 서로 연결되어야 합니다
4. 각 챕터마다 어떤 답변을 참고했는지 소스 번호를 명시하세요
5. 감정적인 순간은 특히 섬세하게 묘사해주세요

기억하세요: "정리"가 아니라 "문학적 재탄생"입니다.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.5,
    })

    const storyContent = response.choices[0].message.content?.trim() || ''

    // 토큰 사용량 로깅
    const usage = response.usage
    console.log('[DOTTING] Story Generation Token Usage:', {
      session_id: sessionId,
      prompt_tokens: usage?.prompt_tokens,
      completion_tokens: usage?.completion_tokens,
      total_tokens: usage?.total_tokens,
      estimated_cost_usd: usage ? (
        (usage.prompt_tokens * 0.0025 / 1000) + 
        (usage.completion_tokens * 0.01 / 1000)
      ).toFixed(4) : 'N/A'
    })

    // 챕터 파싱
    const chapters = parseChapters(storyContent, qaHistory)

    // 파싱 실패 검증 (저장하지 않고 에러 반환)
    if (chapters.length === 0) {
      console.error('[DOTTING] Chapter parsing failed:', storyContent.slice(0, 500))
      return NextResponse.json(
        { error: '이야기 생성에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    if (chapters.length !== 3) {
      console.warn('[DOTTING] Expected 3 chapters, got:', chapters.length)
      // 3개가 아니어도 1개 이상이면 진행 (품질 로그만)
    }

    // DB에 저장
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

    // 기존 draft가 있으면 삭제 (덮어쓰기 방식)
    await supabase
      .from('output_drafts')
      .delete()
      .eq('session_id', sessionId)

    // output_drafts 생성
    const { data: draft, error: draftError } = await supabase
      .from('output_drafts')
      .insert({
        session_id: sessionId,
        title: `${subjectName}님의 이야기`,
        status: 'draft',
      })
      .select()
      .single()

    if (draftError) {
      console.error('[DOTTING] Draft creation error:', draftError)
      return NextResponse.json(
        { error: '스토리 저장에 실패했습니다' },
        { status: 500 }
      )
    }

    // chapters 저장 (source_message_ids 포함)
    const chaptersToInsert = chapters.map((chapter, index) => ({
      output_draft_id: draft.id,
      order_index: index,
      title: chapter.title,
      content: chapter.content,
      source_message_ids: chapter.sourceMessageIds || [],
    }))

    const { error: chaptersError } = await supabase
      .from('chapters')
      .insert(chaptersToInsert)

    if (chaptersError) {
      console.error('[DOTTING] Chapters creation error:', chaptersError)
    }

    return NextResponse.json({ 
      success: true,
      draftId: draft.id,
      chapters: chapters.map(c => ({ title: c.title, content: c.content })),
      usage: {
        prompt_tokens: usage?.prompt_tokens,
        completion_tokens: usage?.completion_tokens,
        total_tokens: usage?.total_tokens,
      }
    })

  } catch (error) {
    console.error('[DOTTING] Story generation error:', error)
    return NextResponse.json(
      { error: '스토리 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

interface ParsedChapter {
  title: string
  content: string
  sourceIndices: number[]
  sourceMessageIds: string[]
}

function parseChapters(
  content: string, 
  qaHistory: { question: string; answer: string; messageId?: string; orderIndex: number }[]
): ParsedChapter[] {
  const chapters: ParsedChapter[] = []
  
  // ---CHAPTER--- 형식으로 파싱
  const chapterBlocks = content.split('---CHAPTER---').filter(block => block.trim())
  
  for (const block of chapterBlocks) {
    const titleMatch = block.match(/제목:\s*([^\n]+?)(?:\n|소스:|---CONTENT---)/)
    const sourceMatch = block.match(/소스:\s*([^\n]+?)(?:\n|---CONTENT---)/)
    const contentMatch = block.match(/---CONTENT---\s*([\s\S]*?)(?:---END---|$)/)
    
    if (titleMatch && contentMatch) {
      const title = titleMatch[1].trim()
      const chapterContent = contentMatch[1].trim()
      
      // 소스 인덱스 파싱
      let sourceIndices: number[] = []
      if (sourceMatch) {
        sourceIndices = sourceMatch[1]
          .split(/[,\s]+/)
          .map(s => parseInt(s.trim()))
          .filter(n => !isNaN(n))
      }

      // source_message_ids 매핑
      const sourceMessageIds = sourceIndices
        .map(idx => qaHistory[idx - 1]?.messageId)
        .filter((id): id is string => !!id)

      // 최소 품질 검증
      if (chapterContent.length >= 200) {
        chapters.push({
          title,
          content: chapterContent,
          sourceIndices,
          sourceMessageIds,
        })
      }
    }
  }

  return chapters
}
