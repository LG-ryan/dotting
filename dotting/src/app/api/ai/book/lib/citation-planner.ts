/**
 * DOTTING Phase B1: Citation Planner
 * 
 * 역할: 챕터 구조와 문단별 근거 계획 생성
 * 
 * MASTER 원칙:
 * - 문단 작성 전에 반드시 plan 생성
 * - grounded 문단은 source_message_ids 필수
 * - 계획에 없는 source 사용 금지
 * - 단순 병합 금지 (에피소드 내용 그대로 붙이기 금지)
 */

import OpenAI from 'openai'
import type { 
  EpisodeForSelection,
  ChapterPlan,
  ParagraphPlan,
  PhaseB1Output,
  CompileOptions
} from './types'
import type { CompilationIntent, ParagraphType } from '@/types/database'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface MessageForPlan {
  id: string
  role: string
  content: string
  order_index: number
}

export async function createCitationPlan(
  selectedEpisodes: EpisodeForSelection[],
  messages: MessageForPlan[],
  options: CompileOptions,
  intent: CompilationIntent
): Promise<PhaseB1Output> {
  
  // 에피소드별 메시지 매핑
  const episodeMessageMap = new Map<string, MessageForPlan[]>()
  for (const ep of selectedEpisodes) {
    const epMessages = messages.filter(m => ep.source_message_ids.includes(m.id))
    episodeMessageMap.set(ep.id, epMessages)
  }
  
  // 에피소드 정보 요약
  const episodeInfos = selectedEpisodes.map(ep => ({
    id: ep.id,
    theme: ep.theme,
    time_period: ep.time_period || '미상',
    summary: ep.summary,
    emotional_weight: ep.emotional_weight,
    has_turning_point: ep.has_turning_point,
    has_reflection: ep.has_reflection,
    available_message_ids: ep.source_message_ids
  }))
  
  const systemPrompt = `당신은 회고록 편집자입니다. 에피소드들을 바탕으로 책의 챕터 구조와 각 문단의 근거 계획을 수립합니다.

## 역할
- 에피소드들을 챕터로 구성
- 각 챕터 내 문단의 목적과 사용할 source를 미리 계획
- grounded 문단은 반드시 source_message_ids를 지정

## 문단 타입 (paragraph_type)
- grounded: 실제 인터뷰 내용 기반. source_message_ids 필수 (1개 이상)
- connector: 문단 간 연결 문장. source 없어도 됨
- editorial: 편집자 해석/코멘트. source 없어도 됨
- intro: 챕터 서두. source ${intent === 'final' ? '권장' : '없어도 됨'}
- outro: 챕터 마무리. source ${intent === 'final' ? '권장' : '없어도 됨'}

## 구조 원칙
- 구조 모드: ${options.structureMode === 'timeline' ? '시간순' : options.structureMode === 'thematic' ? '주제별' : '자유형'}
- 희망 챕터 수: ${options.chapterCountMin}~${options.chapterCountMax} (강제 아님, 서사에 맞게 조절)
- 챕터당 희망 문단 수: ${options.paragraphsPerChapterMin}~${options.paragraphsPerChapterMax}
- 회고/성찰: ${options.reflectionPlacement === 'late' ? '후반부에 배치' : '전체에 분산'}

## 중요 규칙
1. grounded 문단의 source_message_ids는 반드시 해당 에피소드의 available_message_ids 중에서만 선택
2. 에피소드 내용을 그대로 복사하지 말고, 어떤 메시지를 어떻게 활용할지 계획만 수립
3. 각 문단의 purpose는 "이 문단이 왜 필요한가"를 명확히

## 출력 형식 (JSON)
{
  "chapters": [
    {
      "chapter_index": 0,
      "title": "챕터 제목",
      "theme_focus": "이 챕터의 주요 주제",
      "time_range": "시간 범위",
      "paragraph_plans": [
        {
          "chapter_index": 0,
          "paragraph_index": 0,
          "type": "intro" | "grounded" | "connector" | "editorial" | "outro",
          "purpose": "이 문단의 목적 (한 문장)",
          "used_episode_ids": ["에피소드 uuid"],
          "source_message_ids": ["메시지 uuid"] // grounded 타입은 필수
        }
      ]
    }
  ]
}

반드시 JSON만 출력하세요.`

  const userPrompt = `다음 에피소드들을 바탕으로 책의 챕터 구조와 문단 계획을 수립하세요.

## 선별된 에피소드 (${selectedEpisodes.length}개)
${JSON.stringify(episodeInfos, null, 2)}

## 챕터 구조와 문단 계획을 JSON으로 출력하세요.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    
    const chaptersRaw = parsed.chapters || []
    
    // 검증 및 정제
    const chapters: ChapterPlan[] = chaptersRaw.map((ch: any, chIdx: number) => {
      const paragraphPlans: ParagraphPlan[] = (ch.paragraph_plans || []).map((p: any, pIdx: number) => {
        const type = validateParagraphType(p.type)
        
        // grounded인데 source가 없으면 에러 방지를 위해 빈 배열 유지 (runner에서 검증)
        const sourceMessageIds = Array.isArray(p.source_message_ids) 
          ? p.source_message_ids.filter((id: string) => typeof id === 'string')
          : []
        
        return {
          chapter_index: chIdx,
          paragraph_index: pIdx,
          type,
          purpose: p.purpose || '목적 미상',
          used_episode_ids: Array.isArray(p.used_episode_ids) ? p.used_episode_ids : [],
          source_message_ids: sourceMessageIds
        }
      })
      
      return {
        chapter_index: chIdx,
        title: ch.title || `챕터 ${chIdx + 1}`,
        theme_focus: ch.theme_focus || '',
        time_range: ch.time_range || '',
        paragraph_plans: paragraphPlans
      }
    })
    
    // 통계 계산
    let totalParagraphs = 0
    let groundedCount = 0
    let connectorCount = 0
    let introOutroCount = 0
    
    for (const ch of chapters) {
      totalParagraphs += ch.paragraph_plans.length
      for (const p of ch.paragraph_plans) {
        if (p.type === 'grounded') groundedCount++
        else if (p.type === 'connector') connectorCount++
        else if (p.type === 'intro' || p.type === 'outro') introOutroCount++
      }
    }
    
    console.log(`[DOTTING Phase B1] Plan created: ${chapters.length} chapters, ${totalParagraphs} paragraphs (grounded=${groundedCount})`)
    
    return {
      chapters,
      total_paragraphs: totalParagraphs,
      grounded_count: groundedCount,
      connector_count: connectorCount,
      intro_outro_count: introOutroCount
    }
    
  } catch (error) {
    console.error('[DOTTING Phase B1] Error:', error)
    throw new Error('Citation plan 생성에 실패했습니다.')
  }
}

function validateParagraphType(type: string): ParagraphType {
  const valid: ParagraphType[] = ['grounded', 'connector', 'editorial', 'intro', 'outro']
  return valid.includes(type as ParagraphType) ? type as ParagraphType : 'grounded'
}
