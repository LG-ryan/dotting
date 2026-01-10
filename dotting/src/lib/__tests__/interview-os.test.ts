/**
 * Interview OS Unit 테스트
 * 
 * 실행: npm run test
 * 
 * 테스트 항목:
 * A) 슬롯 순환 (scene → turning_point → relationship)
 * B) 피로도 누적 → light 강제
 * C) 짧은 답변 하이브리드 (1회: auto, 2회: modal)
 * D) 질문 분류 (보수적 처리)
 * E) 버전 기반 동시성 (CAS)
 */

import { describe, it, expect } from 'vitest'
import {
  InterviewState,
  DEFAULT_INTERVIEW_STATE,
  processQuestionGenerated,
  processAnswer,
  processAnswerWithVersion,
  classifyQuestionType,
  isShortAnswer,
  getShortAnswerAction,
  shouldForceLight,
  getQuestionContext,
} from '../interview-os'

describe('Interview OS', () => {
  
  // ============================================
  // 테스트 A: 슬롯 순환
  // ============================================
  describe('슬롯 순환', () => {
    it('10턴 동안 scene → turning_point → relationship 패턴으로 순환해야 함', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE }
      const slots: string[] = []
      
      for (let i = 0; i < 10; i++) {
        slots.push(state.current_slot)
        state = processQuestionGenerated(state, 'light')
      }
      
      const expectedPattern = ['scene', 'turning_point', 'relationship']
      for (let i = 0; i < slots.length; i++) {
        expect(slots[i]).toBe(expectedPattern[i % 3])
      }
    })
    
    it('3턴 완료 시 slot_cycle_count가 증가해야 함', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE }
      
      state = processQuestionGenerated(state, 'light') // scene → turning_point
      state = processQuestionGenerated(state, 'light') // turning_point → relationship
      state = processQuestionGenerated(state, 'light') // relationship → scene (사이클 완료)
      
      expect(state.slot_cycle_count).toBe(1)
    })
  })
  
  // ============================================
  // 테스트 B: 피로도 시스템
  // ============================================
  describe('피로도 시스템', () => {
    it('heavy 질문은 피로도 +2', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE }
      state = processQuestionGenerated(state, 'heavy')
      expect(state.fatigue_score).toBe(2)
    })
    
    it('medium 질문은 피로도 +1', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE }
      state = processQuestionGenerated(state, 'medium')
      expect(state.fatigue_score).toBe(1)
    })
    
    it('light 질문은 피로도 리셋', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, fatigue_score: 4 }
      state = processQuestionGenerated(state, 'light')
      expect(state.fatigue_score).toBe(0)
    })
    
    it('피로도 3 이상이면 forceLight = true', () => {
      const state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, fatigue_score: 3 }
      expect(shouldForceLight(state)).toBe(true)
    })
    
    it('heavy 2회 후 forceLight = true', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE }
      state = processQuestionGenerated(state, 'heavy') // +2
      state = processQuestionGenerated(state, 'heavy') // +2 = 4
      expect(shouldForceLight(state)).toBe(true)
    })
  })
  
  // ============================================
  // 테스트 C: 짧은 답변 하이브리드
  // ============================================
  describe('짧은 답변 처리', () => {
    it('30자 미만은 짧은 답변으로 판정', () => {
      expect(isShortAnswer('네, 좋았어요')).toBe(true)
      expect(isShortAnswer('네')).toBe(true)
    })
    
    it('30자 이상은 긴 답변으로 판정', () => {
      const longAnswer = '그때는 정말 힘들었지만, 가족들 덕분에 잘 이겨낼 수 있었어요.'
      expect(isShortAnswer(longAnswer)).toBe(false)
    })
    
    it('첫 번째 짧은 답변 → auto_followup', () => {
      const state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, short_answer_count: 0 }
      expect(getShortAnswerAction(state, '네')).toBe('auto_followup')
    })
    
    it('두 번째 짧은 답변 → show_modal', () => {
      const state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, short_answer_count: 1 }
      expect(getShortAnswerAction(state, '네')).toBe('show_modal')
    })
    
    it('긴 답변 후 short_answer_count 리셋', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, short_answer_count: 2 }
      // 30자 이상 문자열
      state = processAnswer(state, '그때는 정말 힘들었지만, 가족들 덕분에 잘 이겨낼 수 있었어요. 특히 어머니가 많이 도와주셨습니다.')
      expect(state.short_answer_count).toBe(0)
    })
  })
  
  // ============================================
  // 테스트 D: 질문 분류
  // ============================================
  describe('질문 분류', () => {
    /**
     * 분류 규칙 (스펙):
     * - heavy: heavy 키워드 2개 이상
     * - medium: heavy 키워드 1개
     * - light: light 키워드 있거나, 아무것도 없으면 보수적으로 light
     */
    
    it('light 키워드 → light', () => {
      expect(classifyQuestionType('어린 시절 가장 좋아하던 놀이는 뭐였어요?')).toBe('light')
      expect(classifyQuestionType('평소에 무엇을 즐기세요?')).toBe('light')
    })
    
    it('heavy 키워드 1개 → medium (보수적)', () => {
      expect(classifyQuestionType('그때 후회되는 일이 있었나요?')).toBe('medium')
    })
    
    it('heavy 키워드 2개 이상 → heavy', () => {
      expect(classifyQuestionType('상실과 후회, 힘들었던 그 시절...')).toBe('heavy')
    })
    
    it('키워드 없음 → light (보수적 기본값)', () => {
      expect(classifyQuestionType('그 일이 지금까지 영향을 주고 있나요?')).toBe('light')
    })
    
    it('forceLight=true → 항상 light', () => {
      expect(classifyQuestionType('상실의 아픔이 있었나요?', true)).toBe('light')
    })
  })
  
  // ============================================
  // 테스트 E: 버전 기반 동시성
  // ============================================
  /**
   * ⚠️ Unit 테스트 경계:
   * - 여기서는 "version 증가 로직"만 검증
   * - "DB에서 실제로 두 번째 업데이트가 거부되는지"는 Integration 테스트에서 검증
   * 
   * Integration 테스트 필요 항목 (로컬 DB 준비 후):
   * - 같은 version으로 2개 UPDATE 시 하나는 실패해야 함
   * - RLS: anon 키로 analytics_events INSERT 거부 확인
   */
  describe('버전 (CAS) - Unit 경계', () => {
    it('상태 업데이트 시 version이 증가해야 함', () => {
      let state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, version: 0 }
      state = processQuestionGenerated(state, 'light')
      expect(state.version).toBe(1)
    })
    
    it('같은 원본 상태에서 두 업데이트는 같은 version을 가짐 (충돌 감지 가능)', () => {
      const original: InterviewState = { ...DEFAULT_INTERVIEW_STATE, version: 0 }
      
      // 동시에 두 요청이 같은 상태를 읽었다고 가정
      const update1 = processAnswerWithVersion(original, '긴 답변...')
      const update2 = processAnswerWithVersion(original, '짧은 답변')
      
      // 둘 다 version 1 → DB에서 CAS로 충돌 감지 가능
      // ⚠️ 실제 거부는 Integration 테스트에서 검증
      expect(update1.version).toBe(1)
      expect(update2.version).toBe(1)
    })
  })
  
  // ============================================
  // 테스트: QuestionContext
  // ============================================
  describe('QuestionContext', () => {
    it('짧은 답변 follow-up은 forceLight=true', () => {
      const state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, short_answer_count: 0 }
      const context = getQuestionContext(state, '네')
      
      expect(context.isAutoFollowup).toBe(true)
      expect(context.forceLight).toBe(true)
    })
    
    it('피로도 초과 시 forceLight=true', () => {
      const state: InterviewState = { ...DEFAULT_INTERVIEW_STATE, fatigue_score: 4 }
      const context = getQuestionContext(state, '긴 답변입니다 어쩌구저쩌구 30자 이상')
      
      expect(context.forceLight).toBe(true)
    })
  })
})
