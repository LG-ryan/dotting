/**
 * DOTTING Phase B2: Paragraph Writer
 * 
 * 역할: Citation Plan에 따라 실제 문단 작성
 * 
 * MASTER 원칙 (핵심):
 * - B1 plan 없이는 실행 금지
 * - plan의 source_message_ids 밖 사실/인용 금지
 * - grounded 문단은 source 내용만 사용
 * - 단순 병합 금지 (에피소드 내용 그대로 붙이기 금지)
 * - 감정 과잉 해석 금지
 */

import OpenAI from 'openai'
import type { 
  EpisodeForSelection,
  PhaseB1Output,
  PhaseB2Output,
  WrittenParagraph,
  CompileOptions,
  ChapterPlan
} from './types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface MessageForWrite {
  id: string
  role: string
  content: string
  order_index: number
}

export async function writeParagraphs(
  plan: PhaseB1Output,
  messages: MessageForWrite[],
  episodes: EpisodeForSelection[],
  options: CompileOptions
): Promise<PhaseB2Output> {
  
  // 메시지 ID → 내용 맵
  const messageMap = new Map<string, MessageForWrite>()
  for (const msg of messages) {
    messageMap.set(msg.id, msg)
  }
  
  // 에피소드 ID → 에피소드 맵
  const episodeMap = new Map<string, EpisodeForSelection>()
  for (const ep of episodes) {
    episodeMap.set(ep.id, ep)
  }
  
  const allParagraphs: WrittenParagraph[] = []
  let totalTokens = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  
  // 챕터별로 문단 작성
  for (const chapterPlan of plan.chapters) {
    const chapterParagraphs = await writeChapterParagraphs(
      chapterPlan,
      messageMap,
      episodeMap,
      options
    )
    
    allParagraphs.push(...chapterParagraphs.paragraphs)
    totalTokens.prompt_tokens += chapterParagraphs.token_usage.prompt_tokens
    totalTokens.completion_tokens += chapterParagraphs.token_usage.completion_tokens
    totalTokens.total_tokens += chapterParagraphs.token_usage.total_tokens
  }
  
  console.log(`[DOTTING Phase B2] Written ${allParagraphs.length} paragraphs, tokens: ${totalTokens.total_tokens}`)
  
  return {
    paragraphs: allParagraphs,
    token_usage: totalTokens
  }
}

async function writeChapterParagraphs(
  chapterPlan: ChapterPlan,
  messageMap: Map<string, MessageForWrite>,
  episodeMap: Map<string, EpisodeForSelection>,
  options: CompileOptions
): Promise<{ paragraphs: WrittenParagraph[]; token_usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  
  // 이 챕터에서 사용할 source 텍스트 수집
  const sourceTexts: Array<{ 
    paragraph_index: number
    type: string
    purpose: string
    sources: Array<{ message_id: string; content: string }>
    episode_summaries: string[]
  }> = []
  
  for (const para of chapterPlan.paragraph_plans) {
    const sources: Array<{ message_id: string; content: string }> = []
    const episodeSummaries: string[] = []
    
    // source_message_ids에서 실제 내용 추출
    for (const msgId of para.source_message_ids) {
      const msg = messageMap.get(msgId)
      if (msg && msg.role === 'user') {
        sources.push({ message_id: msgId, content: msg.content })
      }
    }
    
    // 에피소드 요약 (참고용)
    for (const epId of para.used_episode_ids) {
      const ep = episodeMap.get(epId)
      if (ep) {
        episodeSummaries.push(ep.summary)
      }
    }
    
    sourceTexts.push({
      paragraph_index: para.paragraph_index,
      type: para.type,
      purpose: para.purpose,
      sources,
      episode_summaries: episodeSummaries
    })
  }
  
  const systemPrompt = `당신은 회고록 작가입니다. 주어진 계획과 source 텍스트만을 사용하여 문단을 작성합니다.

## 핵심 규칙 (절대 위반 금지)
1. 제공된 source 텍스트 외의 사실을 추가하지 마세요
2. 감정을 과잉 해석하지 마세요 (원문에 없는 "인생에서 가장", "극도로" 등 금지)
3. 에피소드 내용을 그대로 복사하지 말고, 문학적으로 재구성하세요
4. 각 문단은 독립적으로 읽혀야 하지만, 전체 흐름과 연결되어야 합니다

## 문단 타입별 작성 지침
- grounded: source 텍스트의 내용만 사용. 사실을 바탕으로 서사적으로 재구성.
- connector: 앞뒤 문단을 자연스럽게 연결. 새로운 사실 추가 금지.
- editorial: 편집자의 짧은 해석. "~로 보인다", "~했을 것이다" 톤.
- intro: 챕터 도입. 독자의 기대를 설정. 구체적 사건 언급은 source가 있을 때만.
- outro: 챕터 마무리. 여운을 남기되 과장 금지.

## 문체
- 1인칭 시점 (화자의 목소리)
- 구어체와 문어체의 적절한 혼합
- 한국어 존댓말 (합쇼체 또는 해요체 일관성 유지)

## 출력 형식 (JSON)
{
  "paragraphs": [
    {
      "paragraph_index": 0,
      "content": "작성된 문단 텍스트"
    }
  ]
}

반드시 JSON만 출력하세요.`

  const userPrompt = `## 챕터: "${chapterPlan.title}"
주제: ${chapterPlan.theme_focus}
시간대: ${chapterPlan.time_range}

## 문단 계획 및 Source
${sourceTexts.map(st => `
### 문단 ${st.paragraph_index + 1} (${st.type})
목적: ${st.purpose}
${st.sources.length > 0 ? `
Source 텍스트 (이 내용만 사용):
${st.sources.map(s => `- "${s.content}"`).join('\n')}
` : '(source 없음 - 연결/편집 문단)'}
${st.episode_summaries.length > 0 ? `참고 요약: ${st.episode_summaries.join('; ')}` : ''}
`).join('\n')}

위 계획에 따라 각 문단을 작성하세요.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,  // 약간의 창의성 허용
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    
    const writtenParagraphs = (parsed.paragraphs || []).map((p: any, idx: number) => {
      const planPara = chapterPlan.paragraph_plans[p.paragraph_index ?? idx]
      
      return {
        chapter_index: chapterPlan.chapter_index,
        paragraph_index: p.paragraph_index ?? idx,
        type: planPara?.type || 'grounded',
        content: p.content || '',
        source_episode_ids: planPara?.used_episode_ids || [],
        source_message_ids: planPara?.source_message_ids || []
      } as WrittenParagraph
    })
    
    // 누락된 문단 처리
    for (const planPara of chapterPlan.paragraph_plans) {
      const exists = writtenParagraphs.some(
        (p: WrittenParagraph) => p.paragraph_index === planPara.paragraph_index
      )
      if (!exists) {
        writtenParagraphs.push({
          chapter_index: chapterPlan.chapter_index,
          paragraph_index: planPara.paragraph_index,
          type: planPara.type,
          content: '[AI 생성 실패]',
          source_episode_ids: planPara.used_episode_ids,
          source_message_ids: planPara.source_message_ids
        })
      }
    }
    
    // paragraph_index로 정렬
    writtenParagraphs.sort((a: WrittenParagraph, b: WrittenParagraph) => a.paragraph_index - b.paragraph_index)
    
    return {
      paragraphs: writtenParagraphs,
      token_usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      }
    }
    
  } catch (error) {
    console.error(`[DOTTING Phase B2] Chapter ${chapterPlan.chapter_index} error:`, error)
    
    // 폴백: 계획대로 빈 문단 반환
    return {
      paragraphs: chapterPlan.paragraph_plans.map(p => ({
        chapter_index: chapterPlan.chapter_index,
        paragraph_index: p.paragraph_index,
        type: p.type,
        content: '[AI 생성 실패]',
        source_episode_ids: p.used_episode_ids,
        source_message_ids: p.source_message_ids
      })),
      token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }
  }
}
