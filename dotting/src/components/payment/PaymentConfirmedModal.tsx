'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { triggerHaptic } from '@/lib/haptic'

interface PaymentConfirmedModalProps {
  isOpen: boolean
  onClose: () => void
  packageType: 'pdf_only' | 'standard' | 'premium'
  subjectName: string
  orderId: string
}

export function PaymentConfirmedModal({
  isOpen,
  onClose,
  packageType,
  subjectName,
  orderId,
}: PaymentConfirmedModalProps) {
  const [dotsVisible, setDotsVisible] = useState([false, false, false])

  // 패키지별 활성 점 개수 (Essay: 1, Story: 2, Heritage: 3)
  const activeDotsCount = packageType === 'pdf_only' ? 1 : packageType === 'standard' ? 2 : 3
  const isHeritage = packageType === 'premium'
  const isStory = packageType === 'standard'
  const isEssay = packageType === 'pdf_only'

  useEffect(() => {
    if (!isOpen) return

    // Ink Spread 애니메이션: 점진적 채우기 (0.6s)
    // 각 점이 200ms 간격으로 순차적으로 스며듦
    const timer1 = setTimeout(() => setDotsVisible([true, false, false]), 0)
    const timer2 = setTimeout(() => setDotsVisible([true, true, false]), 200)
    const timer3 = setTimeout(() => setDotsVisible([true, true, true]), 400)

    // 마지막 활성 점이 완전히 안착하는 순간 Heavy Haptic
    // Essay: 0ms, Story: 200ms, Heritage: 400ms
    // 안착 완료 시점: 각 타이밍 + 200ms (transition duration)
    const hapticDelay = activeDotsCount === 1 ? 200 : activeDotsCount === 2 ? 400 : 600
    const hapticTimer = setTimeout(() => {
      triggerHaptic('heavy')
    }, hapticDelay)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(hapticTimer)
    }
  }, [isOpen, activeDotsCount])

  if (!isOpen) return null

  const handleStartInterview = () => {
    // localStorage에 모달 본 기록 저장
    localStorage.setItem(`celebration_${orderId}`, 'true')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div 
        className="w-full max-w-md mx-4 rounded-2xl shadow-2xl" 
        style={{ 
          backgroundColor: '#FFFCF7',
          padding: '64px 48px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06), 0 16px 48px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* 점 3개 (Ink Spread) - 패키지별 활성화 */}
        <div className="flex justify-center gap-3 mb-12">
          {[0, 1, 2].map((index) => {
            const isActive = index < activeDotsCount
            const shouldShow = dotsVisible[index]
            
            return (
              <span
                key={index}
                className={`w-4 h-4 rounded-full ${
                  shouldShow && isActive
                    ? 'opacity-100 scale-100'
                    : shouldShow && !isActive
                    ? 'opacity-30 scale-100'
                    : 'opacity-0 scale-0'
                }`}
                style={{
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  ...(shouldShow && isActive && isHeritage
                    ? {
                        background: 'linear-gradient(135deg, #E5D4B8 0%, #F5E6D3 50%, #E5D4B8 100%)',
                        boxShadow: '0 0 4px rgba(212, 165, 116, 0.2)',
                      }
                    : shouldShow
                    ? {
                        background: isActive ? '#1A365D' : 'rgba(212, 165, 116, 0.3)',
                      }
                    : {}),
                }}
              />
            )
          })}
        </div>

        {/* 헤더 - 패키지별 워딩 */}
        <h2 
          className="text-center mb-8 leading-[1.4]" 
          style={{ 
            fontFamily: "'Noto Serif KR', Batang, Georgia, serif",
            fontSize: '28px',
            fontWeight: 600,
            color: '#1A365D',
            wordBreak: 'keep-all',
            letterSpacing: '-0.02em',
          }}
          dangerouslySetInnerHTML={{
            __html: isEssay
              ? '첫 번째 기록의 조각이<br />찍혔습니다'
              : isStory
              ? `${subjectName}님의<br />이야기가 시작됩니다`
              : `${subjectName}님의 기록을 위한<br />준비를 마쳤습니다`
          }}
        />

        {/* 서브텍스트 - 패키지별 워딩 */}
        <p 
          className="text-center mb-12" 
          style={{ 
            fontSize: '17px',
            fontWeight: 300,
            color: '#4A5568',
            lineHeight: '1.8',
            wordBreak: 'keep-all',
          }}
          dangerouslySetInnerHTML={{
            __html: '준비가 완료되었습니다.<br />기록을 시작해 주세요.'
          }}
        />

        {/* CTA 버튼 - 패키지별 워딩 */}
        <div className="space-y-2">
          <Button
            onClick={handleStartInterview}
            size="lg"
            className={`w-full transition-all ${
              isHeritage
                ? 'text-[var(--dotting-deep-navy)] hover:shadow-lg'
                : 'bg-[var(--dotting-deep-navy)] text-white hover:bg-[var(--dotting-deep-navy)]/90'
            }`}
            style={
              isHeritage
                ? {
                    background: 'linear-gradient(135deg, #E5D4B8 0%, #F5E6D3 50%, #E5D4B8 100%)',
                    boxShadow: '0 2px 8px rgba(212, 165, 116, 0.15)',
                  }
                : undefined
            }
          >
            {isEssay
              ? '기록 시작하기'
              : isStory
              ? '기록 시작하기'
              : '첫 번째 점 찍기'}
          </Button>
          
          {/* Heritage 전용: CTA 하단 캡션 (시니어 접근성) */}
          {isHeritage && (
            <p className="text-xs text-center mt-2" style={{ color: '#718096', wordBreak: 'keep-all' }}>
              기록 시작하기
            </p>
          )}
        </div>

        {/* Heritage 전용: 편집장의 편지 */}
        {isHeritage && (
          <div className="mt-16">
            <p 
              className="text-center leading-relaxed"
              style={{
                fontFamily: "'Noto Serif KR', Batang, Georgia, serif",
                fontSize: '14px',
                fontWeight: 300,
                color: '#92400E',
                fontStyle: 'italic',
              }}
            >
              도팅의 편집장이 기록을 위한 준비를 시작합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
