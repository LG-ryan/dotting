/**
 * Interview OS v1
 * 
 * 목표: GPT Pro보다 좋은 "질문 운영체계"
 * - 피로도 점수제 (heavy/medium/light)
 * - 3턴 사이클 (scene → turning_point → relationship)
 * - 짧은 답변 하이브리드 처리
 */

// ============================================
// 타입 정의
// ============================================
export type QuestionType = 'heavy' | 'medium' | 'light'
export type TargetSlot = 'scene' | 'turning_point' | 'relationship'

export interface InterviewState {
  fatigue_score: number           // 현재 피로도 점수
  current_slot: TargetSlot        // 현재 목표 슬롯
  slot_cycle_count: number        // 사이클 완료 횟수
  short_answer_count: number      // 연속 짧은 답변 횟수
  last_question_type: QuestionType | null
  version: number                 // CAS용 버전 (동시성 제어)
}

// 기본 상태
export const DEFAULT_INTERVIEW_STATE: InterviewState = {
  fatigue_score: 0,
  current_slot: 'scene',
  slot_cycle_count: 0,
  short_answer_count: 0,
  last_question_type: null,
  version: 0,  // CAS용 버전 (동시성 제어)
}

// ============================================
// 피로도 점수 시스템
// ============================================
const FATIGUE_SCORES: Record<QuestionType, number> = {
  heavy: 2,   // 전환점/후회/상실/갈등
  medium: 1,  // 관계/가치/자기해석
  light: 0,   // 일상/취향/기억 디테일/감사
}

const FATIGUE_THRESHOLD = 3  // 이 점수 이상이면 light 질문 강제

// 피로도 점수 추가
export function addFatigue(state: InterviewState, questionType: QuestionType): InterviewState {
  const newScore = state.fatigue_score + FATIGUE_SCORES[questionType]
  
  return {
    ...state,
    fatigue_score: newScore,
    last_question_type: questionType,
  }
}

// light 질문 후 피로도 리셋
export function resetFatigue(state: InterviewState): InterviewState {
  return {
    ...state,
    fatigue_score: 0,
  }
}

// 다음 질문 타입이 light여야 하는지 확인
export function shouldForceLight(state: InterviewState): boolean {
  return state.fatigue_score >= FATIGUE_THRESHOLD
}

// ============================================
// 3턴 사이클 시스템
// ============================================
const SLOT_CYCLE: TargetSlot[] = ['scene', 'turning_point', 'relationship']

// 다음 슬롯으로 이동
export function advanceSlot(state: InterviewState): InterviewState {
  const currentIndex = SLOT_CYCLE.indexOf(state.current_slot)
  const nextIndex = (currentIndex + 1) % SLOT_CYCLE.length
  
  return {
    ...state,
    current_slot: SLOT_CYCLE[nextIndex],
    slot_cycle_count: nextIndex === 0 ? state.slot_cycle_count + 1 : state.slot_cycle_count,
  }
}

// 현재 슬롯에 맞는 프롬프트 힌트
export function getSlotPromptHint(slot: TargetSlot): string {
  switch (slot) {
    case 'scene':
      return '구체적인 장면을 물어보세요. "그때 어디였나요?", "누가 있었나요?", "무엇이 보이고 들렸나요?"'
    case 'turning_point':
      return '변화나 전환점을 물어보세요. "그 일 이후 달라진 것이 있었나요?", "결정/포기/시작 같은 변화가 있었나요?"'
    case 'relationship':
      return '관계에 대해 물어보세요. "그 사람과의 관계는 어떻게 됐나요?", "지금도 그 영향이 남아있나요?"'
  }
}

// ============================================
// 짧은 답변 처리
// ============================================
const SHORT_ANSWER_THRESHOLD = 30  // 30자 미만은 짧은 답변

// 답변이 짧은지 확인
export function isShortAnswer(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.length < SHORT_ANSWER_THRESHOLD
}

// 짧은 답변 카운트 업데이트
export function updateShortAnswerCount(state: InterviewState, isShort: boolean): InterviewState {
  if (isShort) {
    return {
      ...state,
      short_answer_count: state.short_answer_count + 1,
    }
  } else {
    // 긴 답변이 오면 리셋
    return {
      ...state,
      short_answer_count: 0,
    }
  }
}

// 짧은 답변 처리 방식 결정
export type ShortAnswerAction = 'auto_followup' | 'show_modal' | 'none'

export function getShortAnswerAction(state: InterviewState, content: string): ShortAnswerAction {
  if (!isShortAnswer(content)) {
    return 'none'
  }
  
  // 첫 번째 짧은 답변: 자동 꼬리물기
  // 두 번째 이상: 모달 표시
  if (state.short_answer_count === 0) {
    return 'auto_followup'
  } else {
    return 'show_modal'
  }
}

// ============================================
// 질문 생성 컨텍스트
// ============================================
export interface QuestionContext {
  state: InterviewState
  forceLight: boolean
  targetSlot: TargetSlot
  slotHint: string
  isAutoFollowup: boolean
  forceLightForFollowup: boolean  // 짧은 답변 follow-up은 light 강제
}

export function getQuestionContext(state: InterviewState, lastAnswerContent?: string): QuestionContext {
  const forceLight = shouldForceLight(state)
  const isShort = lastAnswerContent ? isShortAnswer(lastAnswerContent) : false
  const shortAction = lastAnswerContent ? getShortAnswerAction(state, lastAnswerContent) : 'none'
  const isAutoFollowup = shortAction === 'auto_followup'
  
  // 짧은 답변 follow-up은 항상 light로 강제 (피로감 방지)
  const forceLightForFollowup = isAutoFollowup
  
  return {
    state,
    forceLight: forceLight || forceLightForFollowup,
    targetSlot: forceLight ? 'scene' : state.current_slot,  // 피로도 강제시만 scene으로
    slotHint: getSlotPromptHint(forceLight ? 'scene' : state.current_slot),
    isAutoFollowup,
    forceLightForFollowup,
  }
}

// ============================================
// 상태 업데이트 (답변 수신 후)
// ============================================
export function processAnswer(state: InterviewState, content: string): InterviewState {
  const isShort = isShortAnswer(content)
  let newState = updateShortAnswerCount(state, isShort)
  
  return newState
}

// 질문 생성 후 상태 업데이트
export function processQuestionGenerated(
  state: InterviewState, 
  questionType: QuestionType
): InterviewState {
  let newState = addFatigue(state, questionType)
  
  // light 질문이면 피로도 리셋
  if (questionType === 'light') {
    newState = resetFatigue(newState)
  }
  
  // 슬롯 전진
  newState = advanceSlot(newState)
  
  // 버전 증가 (CAS)
  newState.version = (state.version || 0) + 1
  
  return newState
}

// 답변 처리 후 상태 업데이트 (버전 포함)
export function processAnswerWithVersion(state: InterviewState, content: string): InterviewState {
  const newState = processAnswer(state, content)
  newState.version = (state.version || 0) + 1
  return newState
}

// ============================================
// 질문 분류 (LLM 응답에서 추출 또는 규칙 기반)
// ============================================
const HEAVY_KEYWORDS = [
  '후회', '상실', '이별', '죽음', '갈등', '실패', '좌절', '포기',
  '힘들었', '아팠', '슬펐', '두려', '무서', '배신', '상처',
]

const LIGHT_KEYWORDS = [
  '좋아하', '취미', '일상', '맛있', '즐거', '행복', '감사',
  '기억나', '생각나', '평소', '보통', '자주',
]

export function classifyQuestionType(question: string, forceLight: boolean = false): QuestionType {
  // 피로도 강제 light일 때는 분류 없이 light 반환
  if (forceLight) {
    return 'light'
  }
  
  const lowerQ = question.toLowerCase()
  
  // Heavy 키워드 체크 (엄격하게: 2개 이상 매칭시에만 heavy)
  let heavyCount = 0
  for (const keyword of HEAVY_KEYWORDS) {
    if (lowerQ.includes(keyword)) {
      heavyCount++
    }
  }
  if (heavyCount >= 2) {
    return 'heavy'
  }
  
  // Light 키워드 체크
  for (const keyword of LIGHT_KEYWORDS) {
    if (lowerQ.includes(keyword)) {
      return 'light'
    }
  }
  
  // Heavy 1개만 매칭되면 medium으로 보수적 처리
  if (heavyCount === 1) {
    return 'medium'
  }
  
  // 기본은 light로 보수적 처리 (피로도 폭주 방지)
  return 'light'
}

// ============================================
// 시스템 프롬프트 생성
// ============================================
export function buildInterviewOSPrompt(context: QuestionContext): string {
  const parts: string[] = []
  
  // 피로도 강제 (짧은 답변 follow-up도 light 강제)
  if (context.forceLight && !context.isAutoFollowup) {
    parts.push(`[중요] 사용자가 무거운 질문을 연속으로 받았습니다. 이번에는 가벼운 질문(일상, 취미, 좋은 기억, 감사)을 해주세요.`)
  }
  
  // 슬롯 힌트 (짧은 답변 follow-up이 아닐 때만)
  if (!context.isAutoFollowup) {
    parts.push(`[목표] ${context.slotHint}`)
  }
  
  // 자동 꼬리물기 (짧은 답변 처리 - 항상 light/부드럽게)
  if (context.isAutoFollowup) {
    parts.push(`[참고] 이전 답변이 짧았습니다. 같은 주제에서 구체적인 장면이나 디테일을 부드럽게 물어봐주세요. 
예: "그때 어떤 장면이 떠오르세요?", "조금 더 들려주시겠어요?" 
무거운 감정 질문은 피하고, 가벼운 톤을 유지하세요.`)
  }
  
  return parts.join('\n')
}
