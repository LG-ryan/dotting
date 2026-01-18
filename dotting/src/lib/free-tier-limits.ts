/**
 * 무료 티어 제한 상수
 * 
 * B안: 프로젝트당 질문 10개 + 미리보기 2회
 */

// 무료 질문 수 (프로젝트당)
export const FREE_QUESTIONS_LIMIT = 10

// 무료 미리보기 횟수 (프로젝트당)
export const FREE_PREVIEW_LIMIT = 2

// 결제 완료로 간주되는 주문 상태 (단일 소스)
export const PAID_ORDER_STATUSES = [
  'paid',
  'in_production', 
  'ready_to_ship',
  'shipped',
  'delivered',
  'completed',
] as const

export type PaidOrderStatus = typeof PAID_ORDER_STATUSES[number]

// 제한 초과 메시지
export const LIMIT_MESSAGES = {
  questions: {
    title: '무료 질문을 모두 사용했어요',
    description: '좋은 이야기들이 모이고 있어요! 이제 책으로 완성해볼까요?',
    cta: '책으로 완성하기',
  },
  preview: {
    title: '무료 미리보기를 모두 사용했어요',
    description: '마음에 드는 버전을 찾으셨나요? 결제 후 무제한으로 수정할 수 있어요.',
    cta: '결제하고 완성하기',
  },
}
