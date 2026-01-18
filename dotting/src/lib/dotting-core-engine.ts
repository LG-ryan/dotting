/**
 * DOTTING Core Engine
 * 
 * 헌정사 제안 생성 시스템
 * - AI 워딩 완전 제거 (브랜드 언어 사용)
 * - 편집장 페르소나 프롬프트
 * - 3가지 관점: 경애(敬愛), 추억(追憶), 계승(繼承)
 * - 이모지 엄금, Noto Serif KR 서체미 강조
 */

import { openai } from './openai'

/**
 * 헌정사 제안 타입
 */
export interface DedicationSuggestion {
  type: 'respect' | 'memory' | 'legacy'
  label: string
  text: string
  keywords: string[]
}

/**
 * 헌정사 제안 응답
 */
export interface DedicationSuggestionsResult {
  suggestions: DedicationSuggestion[]
  generated_at: string
  token_count: number
  engine: string
}

/**
 * 이모지 제거 파이프라인
 */
function sanitizeDedication(text: string): string {
  // 1. 모든 유니코드 이모지 제거
  const withoutEmojis = text.replace(
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]/gu,
    ''
  )
  
  // 2. 공백 정리
  const trimmed = withoutEmojis.trim()
  
  // 3. 50자 검증
  if (trimmed.length > 50) {
    return trimmed.substring(0, 50)
  }
  
  // 4. Noto Serif KR 호환성 확인 (한글, 영문, 숫자, 기본 문장부호만)
  const compatible = trimmed.replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s.,·'"()]/g, '')
  
  return compatible
}

/**
 * 에피소드 요약 생성
 */
function generateEpisodeSummary(episodes: any[]): string {
  if (!episodes || episodes.length === 0) {
    return '대화 내용이 없습니다.'
  }

  // 에피소드별 핵심 키워드 추출
  const summaries = episodes.map((ep, idx) => {
    const content = ep.content || ep.text || ''
    const preview = content.substring(0, 100)
    return `${idx + 1}. ${preview}...`
  }).join('\n')

  return summaries
}

/**
 * DOTTING Core Engine을 통한 헌정사 제안 생성
 * 
 * @param subjectName - 화자 이름
 * @param episodes - 인터뷰 에피소드 목록
 * @param markedMoments - 간직할 순간 (오디오 클립)
 * @returns 3가지 관점의 헌정사 제안
 */
export async function generateDottingDedication(
  subjectName: string,
  episodes: any[],
  markedMoments?: any[]
): Promise<DedicationSuggestionsResult> {
  console.log('[DOTTING Core Engine] 헌정사 갈무리 시작')
  console.log(`[DOTTING Core Engine] 화자: ${subjectName}`)
  console.log(`[DOTTING Core Engine] 에피소드 수: ${episodes.length}`)
  
  try {
    // 에피소드 요약 생성
    const episodeSummary = generateEpisodeSummary(episodes)
    
    // 간직할 순간 키워드 추출
    const momentKeywords = markedMoments
      ?.map(m => m.title || m.text)
      .filter(Boolean)
      .join(', ') || '없음'
    
    // 편집장 페르소나 프롬프트
    const systemPrompt = `너는 수십 년간 가문의 역사를 기록해 온 노련한 편집장이다.

사용자가 들려준 수많은 이야기(Dots) 중 가장 빛나는 순간을 찾아내어,
50자 이내의 단단하고 묵직한 문장으로 갈무리하라.

Noto Serif KR 서체로 인쇄되었을 때 그 깊이가 느껴져야 하며,
기술적인 냄새가 나서는 안 된다.

절대로 이모지를 사용하지 말고, 순수한 한글의 아름다움으로 승부하라.

3가지 관점에서 각각 1개씩, 총 3개의 헌정사를 제안하라:

1. 경애(敬愛): 부모님의 삶에 대한 존경과 감사를 담은 문구
   - 키워드: 존경, 감사, 헌신, 사랑
   - 톤: 묵직하고 정중함

2. 추억(追憶): 함께 나눈 특별한 순간을 인용한 문구
   - 키워드: 실제 에피소드에서 발견한 구체적 단어 활용
   - 톤: 따뜻하고 구체적

3. 계승(繼承): 미래 세대에게 전달하는 약속을 담은 문구
   - 키워드: 자녀, 손주, 대대로, 영원히
   - 톤: 결연하고 희망적

응답 형식 (JSON):
{
  "respect": "경애 관점의 헌정사 (50자 이내)",
  "memory": "추억 관점의 헌정사 (50자 이내)",
  "legacy": "계승 관점의 헌정사 (50자 이내)"
}`

    const userPrompt = `화자: ${subjectName}

에피소드 요약:
${episodeSummary}

간직할 순간 키워드: ${momentKeywords}

위 내용을 바탕으로 3가지 관점의 헌정사를 제안해주세요.`

    // DOTTING Core Engine 호출 (OpenAI)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('DOTTING Core Engine 응답 없음')
    }

    const parsed = JSON.parse(content)
    
    // 이모지 필터 및 50자 검증
    const respectText = sanitizeDedication(parsed.respect || '')
    const memoryText = sanitizeDedication(parsed.memory || '')
    const legacyText = sanitizeDedication(parsed.legacy || '')

    // 키워드 추출 (간단한 로직)
    const extractKeywords = (text: string): string[] => {
      return text
        .split(/\s+/)
        .filter(word => word.length >= 2)
        .slice(0, 3)
    }

    const suggestions: DedicationSuggestion[] = [
      {
        type: 'respect',
        label: '경애(敬愛)',
        text: respectText,
        keywords: extractKeywords(respectText)
      },
      {
        type: 'memory',
        label: '추억(追憶)',
        text: memoryText,
        keywords: extractKeywords(memoryText)
      },
      {
        type: 'legacy',
        label: '계승(繼承)',
        text: legacyText,
        keywords: extractKeywords(legacyText)
      }
    ]

    const tokenCount = response.usage?.total_tokens || 0

    console.log('[DOTTING Core Engine] 헌정사 갈무리 완료')
    console.log(`[DOTTING Core Engine] 토큰 사용: ${tokenCount}`)

    return {
      suggestions,
      generated_at: new Date().toISOString(),
      token_count: tokenCount,
      engine: 'DOTTING Core v1.0'
    }

  } catch (error) {
    console.error('[DOTTING Core Engine] 갈무리 실패:', error)
    
    // 실패 시 기본 제안 제공
    console.log('[DOTTING Core Engine] 기본 제안 제공')
    
    return {
      suggestions: [
        {
          type: 'respect',
          label: '경애(敬愛)',
          text: `${subjectName}님의 목소리를 영원히`,
          keywords: ['목소리', '영원히']
        },
        {
          type: 'memory',
          label: '추억(追憶)',
          text: '함께한 모든 순간을 기억하며',
          keywords: ['함께', '순간', '기억']
        },
        {
          type: 'legacy',
          label: '계승(繼承)',
          text: '이 이야기를 자녀에게',
          keywords: ['이야기', '자녀']
        }
      ],
      generated_at: new Date().toISOString(),
      token_count: 0,
      engine: 'DOTTING Core v1.0 (Fallback)'
    }
  }
}
