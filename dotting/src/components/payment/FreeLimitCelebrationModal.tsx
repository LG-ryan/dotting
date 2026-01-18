'use client'

import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription, 
  ModalBody, 
  ModalFooter, 
  ModalButton 
} from '@/components/ui/modal'

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
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* 헤더 */}
      <ModalHeader onClose={onClose}>
        {/* 점 시그니처 */}
        <div className="flex justify-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-[var(--dotting-warm-amber)]" />
          <span className="w-3 h-3 rounded-full bg-[var(--dotting-warm-amber)]" />
          <span className="w-3 h-3 rounded-full bg-[var(--dotting-warm-amber)]" />
        </div>
        
        <ModalTitle>
          {questionCount}개의 이야기가 모였습니다
        </ModalTitle>
        <ModalDescription>
          {subjectName}님의 소중한 추억들이<br />
          책이 될 준비를 마쳤습니다
        </ModalDescription>
      </ModalHeader>

      {/* 본문 */}
      <ModalBody>
        {/* 단계 안내 */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex flex-col items-center text-[var(--dotting-muted-gray)]">
            <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2">
              <span className="text-[13px] font-medium">1</span>
            </div>
            <span className="text-[13px]">미리보기</span>
          </div>
          <div className="w-8 h-px bg-[var(--dotting-border)]" />
          <div className="flex flex-col items-center text-[var(--dotting-muted-gray)]">
            <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2">
              <span className="text-[13px] font-medium">2</span>
            </div>
            <span className="text-[13px]">수정</span>
          </div>
          <div className="w-8 h-px bg-[var(--dotting-border)]" />
          <div className="flex flex-col items-center text-[var(--dotting-muted-gray)]">
            <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2">
              <span className="text-[13px] font-medium">3</span>
            </div>
            <span className="text-[13px]">완성</span>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-[var(--dotting-soft-cream)] rounded-xl p-4 mb-4">
          <p className="text-[13px] leading-[1.4] text-[var(--dotting-muted-gray)] text-center">
            모인 이야기는 저장되어 있습니다<br />
            언제든 돌아올 수 있습니다
          </p>
        </div>
      </ModalBody>

      {/* 버튼 */}
      <ModalFooter>
        <ModalButton variant="ghost" onClick={onClose}>
          나중에 할게요
        </ModalButton>
        <ModalButton onClick={onProceedToPayment}>
          책으로 완성하기
        </ModalButton>
      </ModalFooter>
    </Modal>
  )
}
