'use client'

/**
 * 결제 안내 모달
 * PRD v3.2: 선결제 모델 + 안심
 * 
 * 수동 결제 안내 (카카오 채널 + SLA 명시)
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PACKAGES, PACKAGE_PRICES } from '@/lib/payment-gate'
import type { PackageType } from '@/types/database'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  subjectName: string
  onPaymentRequested?: (orderId: string) => void
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  sessionId,
  subjectName,
  onPaymentRequested,
}: PaymentModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('standard')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'confirm' | 'done'>('select')
  const [orderId, setOrderId] = useState<string | null>(null)

  if (!isOpen) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const handleCreateOrder = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          packageType: selectedPackage,
          amount: PACKAGE_PRICES[selectedPackage],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to create order')
      }

      const data = await res.json()
      setOrderId(data.orderId)
      setStep('done')
      onPaymentRequested?.(data.orderId)
    } catch (err) {
      alert(err instanceof Error ? err.message : '주문 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[var(--dotting-border)]">
          <h2 className="text-xl font-bold text-[var(--dotting-deep-navy)]">
            {step === 'done' ? '결제 안내' : '패키지 선택'}
          </h2>
          <p className="text-sm text-[var(--dotting-muted-text)] mt-1">
            {subjectName}의 이야기를 책으로 만들어드립니다
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <>
              {/* Package Options */}
              <div className="space-y-4 mb-6">
                {(Object.keys(PACKAGES) as PackageType[]).map((pkg) => {
                  const info = PACKAGES[pkg]
                  const isSelected = selectedPackage === pkg
                  return (
                    <button
                      key={pkg}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-[var(--dotting-warm-gold)] bg-[var(--dotting-warm-gold)]/5' 
                          : 'border-[var(--dotting-border)] hover:border-[var(--dotting-warm-gold)]/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-bold ${isSelected ? 'text-[var(--dotting-deep-navy)]' : 'text-[var(--dotting-muted-text)]'}`}>
                            {info.name}
                          </h3>
                          <p className="text-sm text-[var(--dotting-muted-text)] mt-1">
                            {info.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isSelected ? 'text-[var(--dotting-deep-navy)]' : 'text-[var(--dotting-muted-text)]'}`}>
                            ₩{formatPrice(info.price)}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {info.features.map((feature, i) => (
                          <li key={i} className="text-sm text-[var(--dotting-muted-text)] flex items-center gap-2">
                            <svg className="w-4 h-4 text-[var(--dotting-warm-gold)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  )
                })}
              </div>

              {/* CTA */}
              <Button
                onClick={() => setStep('confirm')}
                className="w-full h-12 bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] hover:bg-[#C49660] font-medium"
              >
                {PACKAGES[selectedPackage].name} 선택 - ₩{formatPrice(PACKAGE_PRICES[selectedPackage])}
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              {/* 선택 요약 */}
              <div className="p-4 rounded-xl bg-[var(--dotting-soft-cream)] mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-[var(--dotting-deep-navy)]">{PACKAGES[selectedPackage].name}</p>
                    <p className="text-sm text-[var(--dotting-muted-text)]">{PACKAGES[selectedPackage].description}</p>
                  </div>
                  <p className="text-xl font-bold text-[var(--dotting-deep-navy)]">
                    ₩{formatPrice(PACKAGE_PRICES[selectedPackage])}
                  </p>
                </div>
              </div>

              {/* 안내 문구 */}
              <div className="space-y-4 mb-6 text-sm text-[var(--dotting-muted-text)]">
                <p>
                  결제 완료 후 링크를 보내면 책 제작이 시작됩니다.
                </p>
                <p>
                  • PDF 다운로드 전 100% 환불 가능<br />
                  • 실물 책은 인쇄 불량에 한해 교환
                </p>
              </div>

              {/* CTA */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="flex-1"
                >
                  이전
                </Button>
                <Button
                  onClick={handleCreateOrder}
                  disabled={loading}
                  className="flex-1 bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] hover:bg-[#C49660]"
                >
                  {loading ? '처리 중...' : '결제 진행'}
                </Button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              {/* 결제 안내 */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--dotting-warm-gold)]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--dotting-warm-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--dotting-deep-navy)]">
                  주문이 생성되었습니다
                </h3>
                <p className="text-sm text-[var(--dotting-muted-text)] mt-2">
                  아래 계좌로 입금해주시면 확인 후 시작됩니다
                </p>
              </div>

              {/* 입금 정보 */}
              <div className="p-4 rounded-xl bg-[var(--dotting-soft-cream)] mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--dotting-muted-text)]">금액</span>
                  <span className="font-bold text-[var(--dotting-deep-navy)]">
                    ₩{formatPrice(PACKAGE_PRICES[selectedPackage])}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--dotting-muted-text)]">입금계좌</span>
                  <span className="font-medium text-[var(--dotting-deep-navy)]">
                    카카오뱅크 3333-00-0000000
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--dotting-muted-text)]">예금주</span>
                  <span className="font-medium text-[var(--dotting-deep-navy)]">
                    DOTTING
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--dotting-muted-text)]">입금자명</span>
                  <span className="font-medium text-[var(--dotting-deep-navy)]">
                    {orderId?.slice(-4) || '----'} (주문번호 뒤 4자리)
                  </span>
                </div>
              </div>

              {/* SLA 안내 */}
              <div className="p-4 rounded-xl border border-[var(--dotting-border)] mb-6">
                <h4 className="font-medium text-[var(--dotting-deep-navy)] mb-2">
                  결제 확인 안내
                </h4>
                <ul className="text-sm text-[var(--dotting-muted-text)] space-y-1">
                  <li>• 평일 09:00~18:00 확인</li>
                  <li>• 영업시간 내 <strong>30분 이내</strong> 확인 완료</li>
                  <li>• 주말/공휴일은 다음 영업일 확인</li>
                </ul>
              </div>

              {/* 문의 채널 */}
              <div className="flex gap-3 mb-6">
                <a
                  href="https://pf.kakao.com/_dotting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FEE500] text-[#191919] font-medium hover:bg-[#FDD835]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.477 3 2 6.463 2 10.692c0 2.724 1.8 5.12 4.5 6.462-.2.744-.726 2.692-.832 3.108-.13.504.185.498.39.363.16-.106 2.554-1.735 3.585-2.44.77.107 1.566.163 2.357.163 5.523 0 10-3.463 10-7.692S17.523 3 12 3z"/>
                  </svg>
                  카카오톡 문의
                </a>
                <a
                  href="mailto:support@dotting.co.kr"
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-[var(--dotting-border)] text-[var(--dotting-deep-navy)] font-medium hover:bg-[var(--dotting-soft-cream)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  이메일 문의
                </a>
              </div>

              {/* 닫기 */}
              <Button
                onClick={onClose}
                className="w-full h-12 bg-[var(--dotting-deep-navy)] text-white hover:bg-[#2A4A6F]"
              >
                확인
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
