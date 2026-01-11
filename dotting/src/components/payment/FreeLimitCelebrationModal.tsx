'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FREE_QUESTIONS_LIMIT } from '@/lib/free-tier-limits'

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
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // 모달 열릴 때 confetti 효과
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* 상단 그라데이션 헤더 */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-8 text-center relative overflow-hidden">
          {/* 장식 원들 */}
          <div className="absolute top-4 left-4 w-8 h-8 bg-white/20 rounded-full" />
          <div className="absolute top-12 right-8 w-4 h-4 bg-white/30 rounded-full" />
          <div className="absolute bottom-6 left-12 w-6 h-6 bg-white/20 rounded-full" />
          
          {/* 축하 아이콘 */}
          <div className="text-6xl mb-4">
            {showConfetti ? '🎉' : '📖'}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            축하해요!
          </h2>
          <p className="text-white/90 text-lg">
            {subjectName}님의 이야기가<br />
            <span className="font-semibold">{questionCount}개</span> 모였어요
          </p>
        </div>

        {/* 본문 */}
        <div className="p-6 text-center">
          <p className="text-gray-700 mb-2 text-lg leading-relaxed">
            소중한 추억들이 책이 될 준비를 마쳤어요.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            지금 바로 미리보기로 확인해보세요!
          </p>

          {/* 미리보기 안내 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-1">👀</span>
                <span>미리보기</span>
              </div>
              <span className="text-gray-300">→</span>
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-1">✏️</span>
                <span>수정하기</span>
              </div>
              <span className="text-gray-300">→</span>
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-1">📚</span>
                <span>책 완성</span>
              </div>
            </div>
          </div>

          {/* CTA 버튼들 */}
          <div className="space-y-3">
            <Button
              onClick={onProceedToPayment}
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              📖 책으로 완성하기
            </Button>
            
            <button
              onClick={onClose}
              className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              조금 더 이야기 나눌래요
            </button>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            무료 체험이 끝났어요. 결제 후 무제한으로 질문하고 수정할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  )
}
