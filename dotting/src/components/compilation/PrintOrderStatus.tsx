'use client'

/**
 * DOTTING Print Order Status Component
 * 
 * 자녀 대시보드에서 배송 상태를 표시
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PrintOrderStatus as PrintOrderStatusType } from '@/types/database'

interface PrintOrder {
  id: string
  status: PrintOrderStatusType
  recipient_name: string
  recipient_phone: string
  shipping_address: string
  shipping_address_detail: string | null
  postal_code: string
  tracking_carrier: string | null
  tracking_number: string | null
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
}

interface PrintOrderStatusProps {
  compilationId: string
}

const STATUS_LABELS: Record<PrintOrderStatusType, string> = {
  pending: '인쇄 대기 중',
  printing: '인쇄 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  claim_opened: '문의 처리 중',
  claim_resolved: '문의 해결',
}

const STATUS_DESCRIPTIONS: Record<PrintOrderStatusType, string> = {
  pending: '인쇄 준비가 진행 중입니다. 곧 인쇄가 시작됩니다.',
  printing: '책이 인쇄되고 있습니다. 완료되면 바로 발송해드립니다.',
  shipped: '책이 발송되었습니다! 곧 도착할 예정입니다.',
  delivered: '배송이 완료되었습니다. 소중한 선물이 되길 바랍니다.',
  claim_opened: '문의가 접수되었습니다. 빠르게 처리해드리겠습니다.',
  claim_resolved: '문의가 해결되었습니다.',
}

const CARRIER_LABELS: Record<string, string> = {
  cj: 'CJ대한통운',
  hanjin: '한진택배',
  lotte: '롯데택배',
  post: '우체국',
  logen: '로젠택배',
}

const CARRIER_TRACKING_URLS: Record<string, (trackingNumber: string) => string> = {
  cj: (num) => `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${num}`,
  hanjin: (num) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession=&wblnumText2=${num}`,
  lotte: (num) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${num}`,
  post: (num) => `https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=${num}`,
  logen: (num) => `https://www.ilogen.com/web/personal/trace/${num}`,
}

export default function PrintOrderStatus({ compilationId }: PrintOrderStatusProps) {
  const [order, setOrder] = useState<PrintOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/ai/book/compile/${compilationId}/print-order`)
        if (!res.ok) {
          throw new Error('Failed to fetch order')
        }
        const data = await res.json()
        setOrder(data.printOrder)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [compilationId])

  if (loading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center">
          <p className="text-[var(--dotting-muted-text)]">로딩 중...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !order) {
    return null // 주문이 없으면 표시하지 않음
  }

  const getStatusStep = (status: PrintOrderStatusType): number => {
    const steps: PrintOrderStatusType[] = ['pending', 'printing', 'shipped', 'delivered']
    return steps.indexOf(status)
  }

  const currentStep = getStatusStep(order.status)
  const isClaimStatus = order.status === 'claim_opened' || order.status === 'claim_resolved'

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getTrackingUrl = () => {
    if (!order.tracking_carrier || !order.tracking_number) return null
    const urlFn = CARRIER_TRACKING_URLS[order.tracking_carrier]
    return urlFn ? urlFn(order.tracking_number) : null
  }

  return (
    <Card className="bg-white border-[var(--dotting-border)]">
      <CardHeader>
        <CardTitle className="text-lg text-[var(--dotting-deep-navy)]">배송 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        {!isClaimStatus && (
          <div className="relative">
            <div className="flex justify-between">
              {['인쇄 대기', '인쇄 중', '배송 중', '배송 완료'].map((label, index) => (
                <div key={label} className="flex flex-col items-center z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= currentStep
                        ? 'bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)]'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <span className={`text-xs mt-1 ${
                    index <= currentStep ? 'text-[var(--dotting-deep-navy)]' : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {/* Progress Line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-0">
              <div
                className="h-full bg-[var(--dotting-warm-gold)] transition-all duration-500"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="bg-[var(--dotting-soft-cream)] p-4 rounded-lg">
          <p className="font-medium text-[var(--dotting-deep-navy)]">
            {STATUS_LABELS[order.status]}
          </p>
          <p className="text-sm text-[var(--dotting-muted-text)] mt-1">
            {STATUS_DESCRIPTIONS[order.status]}
          </p>
        </div>

        {/* Tracking Info */}
        {order.tracking_number && (
          <div className="space-y-2">
            <h4 className="font-medium text-[var(--dotting-deep-navy)]">송장 정보</h4>
            <p className="text-sm">
              {CARRIER_LABELS[order.tracking_carrier || ''] || order.tracking_carrier}{' '}
              <span className="font-mono">{order.tracking_number}</span>
            </p>
            {getTrackingUrl() && (
              <a
                href={getTrackingUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-[var(--dotting-warm-brown)] hover:underline"
              >
                배송 조회하기 →
              </a>
            )}
          </div>
        )}

        {/* Shipping Address */}
        <div className="space-y-2">
          <h4 className="font-medium text-[var(--dotting-deep-navy)]">배송지</h4>
          <p className="text-sm text-[var(--dotting-muted-text)]">
            {order.recipient_name} ({order.recipient_phone})
          </p>
          <p className="text-sm text-[var(--dotting-muted-text)]">
            [{order.postal_code}] {order.shipping_address}
            {order.shipping_address_detail && ` ${order.shipping_address_detail}`}
          </p>
        </div>

        {/* Dates */}
        <div className="text-xs text-[var(--dotting-muted-text)] space-y-1">
          <p>주문일: {formatDate(order.created_at)}</p>
          {order.shipped_at && <p>발송일: {formatDate(order.shipped_at)}</p>}
          {order.delivered_at && <p>배송 완료: {formatDate(order.delivered_at)}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
