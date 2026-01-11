'use client'

import { Button } from '@/components/ui/button'

interface FreeLimitCelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  onProceedToPayment: () => void
  subjectName: string
  questionCount: number
}

export function FreeLimitCelebrationModal({
  isOpen,
  onClose,
  onProceedToPayment,
  subjectName,
  questionCount,
}: FreeLimitCelebrationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 - 조용한 럭셔리 스타일 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* X 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] hover:bg-gray-100 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* 상단 - 미니멀 헤더 */}
        <div className="pt-12 pb-8 px-8 text-center border-b border-[var(--dotting-border)]">
          {/* ●●● 완성 시그니처 */}
          <div className="flex justify-center gap-2 mb-6">
            <span className="w-3 h-3 rounded-full bg-[var(--dotting-warm-amber)]" />
            <span className="w-3 h-3 rounded-full bg-[var(--dotting-warm-amber)]" />
            <span className="w-3 h-3 rounded-full bg-[var(--dotting-warm-amber)]" />
          </div>
          
          <h2 className="text-2xl font-bold text-[var(--dotting-deep-navy)] mb-3">
            {questionCount}개의 이야기가 모였어요
          </h2>
          <p className="text-[var(--dotting-muted-gray)]">
            {subjectName}님의 소중한 추억들이<br />
            책이 될 준비를 마쳤어요
          </p>
        </div>

        {/* 본문 - 간결하게 */}
        <div className="p-8">
          {/* 단계 안내 - 미니멀 아이콘 */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex flex-col items-center text-[var(--dotting-muted-gray)]">
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2">
                <span className="text-sm font-medium">1</span>
              </div>
              <span className="text-xs">미리보기</span>
            </div>
            <div className="w-8 h-px bg-[var(--dotting-border)]" />
            <div className="flex flex-col items-center text-[var(--dotting-muted-gray)]">
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2">
                <span className="text-sm font-medium">2</span>
              </div>
              <span className="text-xs">수정</span>
            </div>
            <div className="w-8 h-px bg-[var(--dotting-border)]" />
            <div className="flex flex-col items-center text-[var(--dotting-muted-gray)]">
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2">
                <span className="text-sm font-medium">3</span>
              </div>
              <span className="text-xs">완성</span>
            </div>
          </div>

          {/* CTA 버튼들 */}
          <div className="space-y-3">
            <Button
              onClick={onProceedToPayment}
              size="xl"
              className="w-full"
            >
              책으로 완성하기
            </Button>
            
            <button
              onClick={onClose}
              className="w-full py-3 text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] text-sm transition-colors"
            >
              나중에 할게요
            </button>
          </div>
        </div>

        {/* 하단 안내 - 시그니처 포함 */}
        <div className="border-t border-[var(--dotting-border)] px-6 py-4 bg-[var(--dotting-soft-cream)]">
          <p className="text-xs text-[var(--dotting-muted-gray)] text-center">
            모인 이야기는 저장되어 있어요 · 언제든 돌아올 수 있어요
          </p>
        </div>
      </div>
    </div>
  )
}
