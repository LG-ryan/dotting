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
        className={`dotting-wordmark dotting-wordmark--md ${className}`}
      >
        <span className="dotting-wordmark-d">D</span>
        <span className="dotting-wordmark-otting">OTTING</span>
      </button>

      {/* 확인 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          {/* 모달 */}
          <div className="relative bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--dotting-deep-navy)] mb-2">
              홈으로 이동할까요?
            </h3>
            <p className="text-[var(--dotting-muted-gray)] text-sm mb-6">
              작성 중인 내용은 자동 저장되어 있어요.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--dotting-border)] text-[var(--dotting-deep-navy)] hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--dotting-deep-navy)] text-white hover:bg-[#2A4A6F] transition-colors whitespace-nowrap"
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
