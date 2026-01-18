'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface LogoLinkProps {
  className?: string
  showConfirm?: boolean // 확인 모달 표시 여부 (true면 항상, false면 자동 판단)
}

export function LogoLink({ className = '', showConfirm }: LogoLinkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showModal, setShowModal] = useState(false)

  // 프로젝트 상세 페이지면 자동으로 확인 모달 표시
  const shouldConfirm = showConfirm ?? pathname?.includes('/project/')

  const handleClick = () => {
    if (shouldConfirm) {
      setShowModal(true)
    } else {
      router.push('/')
    }
  }

  const handleConfirm = () => {
    setShowModal(false)
    router.push('/')
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`dotting-wordmark dotting-wordmark--md cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      >
        <span className="dotting-wordmark-d">D</span>
        <span className="dotting-wordmark-otting">OTTING</span>
      </button>

      {/* 확인 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* 배경 오버레이 */}
          <button 
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            onClick={() => setShowModal(false)}
            aria-label="모달 닫기"
          />
          
          {/* 모달 */}
          <div className="relative bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-[24px] leading-[1.35] font-bold text-[var(--dotting-deep-navy)] mb-3">
              홈으로 이동할까요?
            </h3>
            <p className="text-[17px] leading-[1.6] text-[var(--dotting-muted-gray)] mb-6">
              작성 중인 내용은 자동 저장되어 있어요.
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 h-14 px-4 rounded-xl border border-[var(--dotting-border)] text-[17px] font-medium text-[var(--dotting-deep-navy)] hover:bg-[var(--dotting-warm-gray)] active:scale-[0.98] transition-all whitespace-nowrap touch-action-manipulation"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 h-14 px-4 rounded-xl bg-[var(--dotting-deep-navy)] text-white text-[17px] font-semibold hover:bg-[#2A4A6F] active:scale-[0.98] transition-all whitespace-nowrap touch-action-manipulation"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
