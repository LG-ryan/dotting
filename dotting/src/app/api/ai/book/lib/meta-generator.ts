/**
 * DOTTING Phase C: Meta Generator
 * 
 * 역할: 책 제목, 서문, 마무리 생성
 * 
 * 정책:
 * - preview: 서문/마무리 source 없이 허용
 * - final: 서문/마무리 source 권장 (강제 아님), 없으면 warnings 기록
 */

import OpenAI from 'openai'
import type { 
  EpisodeForSelection,
  PhaseB1Output,
  PhaseB2Output,
  PhaseCOutput,
  BookMeta,
  CompileOptions
} from './types'
import type { CompilationIntent } from '@/types/database'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface MessageForMeta {
  id: string
  role: string
  content: string
}

export async function generateMeta(
  plan: PhaseB1Output,
  written: PhaseB2Output,
  episodes: EpisodeForSelection[],
  messages: MessageForMeta[],
  options: CompileOptions,
  intent: CompilationIntent
): Promise<PhaseCOutput> {
  
  // 책의 전체 개요 파악
  const chapterSummaries = plan.chapters.map(ch => ({
    title: ch.title,
    theme: ch.theme_focus,
    time_range: ch.time_range,
    paragraph_count: ch.paragraph_plans.length
  }))
  
  // 핵심 에피소드 요약
  const coreSummaries = episodes
    .filter(ep => ep.emotional_weight >= 7 || ep.has_turning_point)
    .map(ep => ep.summary)
    .slice(0, 5)
  
  // 인상적인 사용자 발언 (source로 사용 가능)
  const memorableQuotes = messages
    .filter(m => m.role === 'user' && m.content.length > 50)
    .slice(0, 3)
    .map(m => ({ id: m.id, content: m.content.slice(0, 200) }))
  
  const systemPrompt = `당신은 회고록 편집자입니다. 책의 제목, 서문, 마무리를 생성합니다.

## 규칙
1. 제목: 이 사람의 인생을 관통하는 키워드나 메시지. 너무 일반적이거나 진부하면 안 됨.
2. 서문: 독자에게 이 책을 왜 읽어야 하는지 설명. ${intent === 'final' ? '가능하면 실제 인터뷰 내용을 인용하세요.' : '추정/편집자 톤으로 짧게.'}
3. 마무리: 이 사람의 이야기가 남기는 여운. ${intent === 'final' ? '가능하면 실제 발언을 인용하세요.' : '간결하게.'}

## 금지 사항
- 인터뷰에 없는 사실 추가
- 과장된 감정 표현
- 클리셰 (예: "파란만장한 인생", "역경을 딛고")

## 출력 형식 (JSON)
{
  "title": "책 제목",
  "subtitle": "부제 (선택)",
  "preface": "서문 텍스트 (2-3문단)",
  "epilogue": "마무리 텍스트 (1-2문단)",
  "preface_source_ids": ["인용한 메시지 ID"] // 없으면 빈 배열
  "epilogue_source_ids": ["인용한 메시지 ID"] // 없으면 빈 배열
}`

  const userPrompt = `## 책 구조
${chapterSummaries.map((ch, i) => `${i + 1}. ${ch.title} (${ch.theme}, ${ch.time_range})`).join('\n')}

## 핵심 이야기
${coreSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 인용 가능한 발언 (source로 사용 가능)
${memorableQuotes.map(q => `[${q.id}] "${q.content}..."`).join('\n')}

위 내용을 바탕으로 책의 제목, 서문, 마무리를 작성하세요.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    
    const meta: BookMeta = {
      title: parsed.title || '제목 없음',
      subtitle: parsed.subtitle || null,
      preface: parsed.preface || null,
      epilogue: parsed.epilogue || null,
      preface_sources: Array.isArray(parsed.preface_source_ids) ? parsed.preface_source_ids : [],
      epilogue_sources: Array.isArray(parsed.epilogue_source_ids) ? parsed.epilogue_source_ids : []
    }
    
    // Warnings 생성
    const warnings: string[] = []
    
    // final인데 서문/마무리에 source가 없으면 경고
    if (intent === 'final') {
      if (meta.preface && meta.preface_sources.length === 0) {
        warnings.push('서문(preface)에 source가 없습니다. 검토가 필요합니다.')
      }
      if (meta.epilogue && meta.epilogue_sources.length === 0) {
        warnings.push('마무리(epilogue)에 source가 없습니다. 검토가 필요합니다.')
      }
    }
    
    // 희망치와 다른 결과 경고
    if (plan.chapters.length < options.chapterCountMin) {
      warnings.push(`챕터 수(${plan.chapters.length})가 희망 최소치(${options.chapterCountMin})보다 적습니다. 에피소드가 부족할 수 있습니다.`)
    }
    if (plan.chapters.length > options.chapterCountMax) {
      warnings.push(`챕터 수(${plan.chapters.length})가 희망 최대치(${options.chapterCountMax})를 초과합니다. 서사가 풍부합니다.`)
    }
    
    console.log(`[DOTTING Phase C] Meta generated: "${meta.title}", warnings: ${warnings.length}`)
    
    return { meta, warnings }
    
  } catch (error) {
    console.error('[DOTTING Phase C] Error:', error)
    
    // 폴백
    return {
      meta: {
        title: '나의 이야기',
        subtitle: null,
        preface: null,
        epilogue: null,
        preface_sources: [],
        epilogue_sources: []
      },
      warnings: ['메타 정보 생성에 실패하여 기본값이 적용되었습니다.']
    }
  }
}
