/**
 * DOTTING Phase A: Episode Selector
 * 
 * 역할: 에피소드를 선별하고 inclusion_status를 판단
 * 
 * MASTER 원칙:
 * - 과감한 삭제 (aggressiveCut: true)
 * - 중복 제거
 * - 서사적 가치 기반 선별
 * - decision_reason/signals 필수 저장
 */

import OpenAI from 'openai'
import type { 
  EpisodeForSelection, 
  EpisodeSelectionResult, 
  EpisodeSelectionSignals,
  PhaseAOutput,
  CompileOptions
} from './types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function selectEpisodes(
  episodes: EpisodeForSelection[],
  options: CompileOptions
): Promise<PhaseAOutput> {
  
  if (episodes.length === 0) {
    return {
      selections: [],
      core_count: 0,
      supporting_count: 0,
      excluded_count: 0
    }
  }
  
  // 에피소드 요약 텍스트 생성
  const episodeSummaries = episodes.map((ep, idx) => ({
    index: idx,
    id: ep.id,
    theme: ep.theme,
    time_period: ep.time_period || '미상',
    summary: ep.summary,
    emotional_weight: ep.emotional_weight,
    has_turning_point: ep.has_turning_point,
    has_reflection: ep.has_reflection
  }))
  
  const systemPrompt = `당신은 전문 편집자입니다. 주어진 에피소드들을 분석하여 책에 포함할지 결정합니다.

## 역할
- 에피소드를 읽고 책의 서사 흐름에 필요한 것과 불필요한 것을 구분
- 중복되는 내용은 과감히 제거
- 감정적 깊이와 전환점이 있는 에피소드 우선

## 선별 기준 (inclusion_status)
- core: 책의 핵심. 반드시 포함. 감정적 깊이, 전환점, 또는 서사의 중심.
- supporting: 핵심을 보조. 맥락이나 배경 설명에 유용.
- appendix: 부록으로 분리. 흥미롭지만 본문 흐름에 방해.
- excluded: 제외. 중복, 산만, 또는 서사적 가치 낮음.

## 편집 원칙
${options.aggressiveCut ? '- 과감하게 삭제하세요. 의심스러우면 제외.' : '- 가능한 많이 포함하되, 명백한 중복만 제외.'}
- 시간순 흐름이 자연스럽게 유지되어야 함
- 회고/성찰 에피소드는 ${options.reflectionPlacement === 'late' ? '후반부에 배치될 것이므로 중요도 높음' : '전체에 분산될 것이므로 균형 있게 선별'}

## 출력 형식 (JSON)
각 에피소드에 대해:
{
  "episode_id": "uuid",
  "inclusion_status": "core" | "supporting" | "appendix" | "excluded",
  "decision_reason": "선별 이유 (한 문장, 사람이 읽을 수 있게)",
  "signals": {
    "emotional_weight": 0-10,
    "has_turning_point": boolean,
    "has_reflection": boolean,
    "redundancy_score": 0-10 (다른 에피소드와 중복 정도),
    "bridge_needed": boolean (다음 에피소드와 연결 문장 필요),
    "narrative_value": 0-10 (서사적 가치)
  }
}

반드시 JSON 배열만 출력하세요.`

  const userPrompt = `다음 ${episodes.length}개의 에피소드를 분석하고 선별해주세요.

## 에피소드 목록
${JSON.stringify(episodeSummaries, null, 2)}

## 선별 결과를 JSON 배열로 출력하세요.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,  // 일관된 판단을 위해 낮은 temperature
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    
    // 응답이 배열인지 객체인지 확인
    const selectionsArray = Array.isArray(parsed) ? parsed : (parsed.selections || parsed.episodes || [])
    
    // 결과 매핑
    const selections: EpisodeSelectionResult[] = selectionsArray.map((item: any) => ({
      episode_id: item.episode_id,
      inclusion_status: validateInclusionStatus(item.inclusion_status),
      decision_reason: item.decision_reason || '판단 근거 없음',
      signals: validateSignals(item.signals)
    }))
    
    // 누락된 에피소드 처리 (기본값: supporting)
    const selectedIds = new Set(selections.map(s => s.episode_id))
    for (const ep of episodes) {
      if (!selectedIds.has(ep.id)) {
        selections.push({
          episode_id: ep.id,
          inclusion_status: 'supporting',
          decision_reason: 'AI 응답에서 누락되어 기본값(supporting) 적용',
          signals: {
            emotional_weight: ep.emotional_weight,
            has_turning_point: ep.has_turning_point,
            has_reflection: ep.has_reflection,
            redundancy_score: 0,
            bridge_needed: false,
            narrative_value: 5
          }
        })
      }
    }
    
    // 통계 계산
    const core_count = selections.filter(s => s.inclusion_status === 'core').length
    const supporting_count = selections.filter(s => s.inclusion_status === 'supporting').length
    const excluded_count = selections.filter(s => 
      s.inclusion_status === 'excluded' || s.inclusion_status === 'appendix'
    ).length
    
    console.log(`[DOTTING Phase A] Selection complete: core=${core_count}, supporting=${supporting_count}, excluded=${excluded_count}`)
    
    return {
      selections,
      core_count,
      supporting_count,
      excluded_count
    }
    
  } catch (error) {
    console.error('[DOTTING Phase A] Error:', error)
    
    // 폴백: 모든 에피소드를 supporting으로
    const fallbackSelections: EpisodeSelectionResult[] = episodes.map(ep => ({
      episode_id: ep.id,
      inclusion_status: 'supporting' as const,
      decision_reason: 'AI 선별 실패로 기본값 적용',
      signals: {
        emotional_weight: ep.emotional_weight,
        has_turning_point: ep.has_turning_point,
        has_reflection: ep.has_reflection,
        redundancy_score: 0,
        bridge_needed: false,
        narrative_value: 5
      }
    }))
    
    return {
      selections: fallbackSelections,
      core_count: 0,
      supporting_count: episodes.length,
      excluded_count: 0
    }
  }
}

function validateInclusionStatus(status: string): EpisodeSelectionResult['inclusion_status'] {
  const valid = ['core', 'supporting', 'appendix', 'excluded', 'candidate']
  return valid.includes(status) ? status as EpisodeSelectionResult['inclusion_status'] : 'supporting'
}

function validateSignals(signals: any): EpisodeSelectionSignals {
  return {
    emotional_weight: clamp(signals?.emotional_weight ?? 5, 0, 10),
    has_turning_point: Boolean(signals?.has_turning_point),
    has_reflection: Boolean(signals?.has_reflection),
    redundancy_score: clamp(signals?.redundancy_score ?? 0, 0, 10),
    bridge_needed: Boolean(signals?.bridge_needed),
    narrative_value: clamp(signals?.narrative_value ?? 5, 0, 10)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
