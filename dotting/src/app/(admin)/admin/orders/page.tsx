'use client'

/**
 * DOTTING Admin Orders
 * 
 * 주문 관리 페이지 (결제/제작/배송 전체 흐름)
 * - 상태별 필터링
 * - 상태 전이 (pending_payment → paid → in_production → ...)
 * - 결제 확인 (수동)
 * - 환불 처리
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { OrderStatus, PackageType } from '@/types/database'

interface Order {
  id: string
  user_id: string
  session_id: string
  package: PackageType
  amount: number
  status: OrderStatus
  payment_method: string | null
  payment_note: string | null
  payment_requested_at: string | null
  paid_at: string | null
  progress: Record<string, unknown>
  recipient_name: string | null
  shipping_address: string | null
  shipping_phone: string | null
  tracking_carrier: string | null
  tracking_number: string | null
  shipped_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  refunded_at: string | null
  refund_amount: number | null
  refund_reason: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // 조인된 데이터
  session?: {
    id: string
    subject_name: string
    subject_relation: string
    user?: {
      id: string
      email: string
      name: string | null
    }
  }
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: '결제 대기',
  paid: '결제 완료',
  in_production: '제작 중',
  ready_to_ship: '배송 준비',
  shipped: '배송 중',
  delivered: '배송 완료',
  completed: '완료',
  refunded: '환불됨',
  cancelled: '취소됨',
  expired: '만료됨',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  in_production: 'bg-indigo-100 text-indigo-800',
  ready_to_ship: 'bg-purple-100 text-purple-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
}

const PACKAGE_LABELS: Record<PackageType, string> = {
  pdf_only: 'PDF 전용',
  standard: '스탠다드 (1권)',
  premium: '프리미엄 (2권)',
}

const CARRIER_OPTIONS = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'post', label: '우체국' },
  { value: 'logen', label: '로젠택배' },
]

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // 입력 상태
  const [reason, setReason] = useState('')
  const [trackingCarrier, setTrackingCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [refundReason, setRefundReason] = useState('')

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.set('status', filterStatus)
      }
      
      const res = await fetch(`/api/admin/orders?${params}`)
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/dashboard')
          return
        }
        throw new Error('Failed to fetch orders')
      }
      
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, router])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleStatusChange = async (
    orderId: string, 
    toStatus: OrderStatus, 
    extraData?: Record<string, unknown>
  ) => {
    setActionLoading(true)
    try {
      // 결제 확인 시 이메일 발송 API 호출
      if (toStatus === 'paid') {
        const confirmRes = await fetch(`/api/orders/${orderId}/confirm-payment`, {
          method: 'POST',
        })
        
        if (!confirmRes.ok) {
          throw new Error('Failed to confirm payment')
        }
      } else {
        // 일반 상태 변경
        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toStatus,
            ...extraData,
          }),
        })
        
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update status')
        }
      }
      
      await fetchOrders()
      setSelectedOrder(null)
      resetInputs()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status')
    } finally {
      setActionLoading(false)
    }
  }

  const resetInputs = () => {
    setReason('')
    setTrackingCarrier('')
    setTrackingNumber('')
    setRefundReason('')
  }

  const getNextActions = (order: Order): { 
    label: string
    status: OrderStatus
    variant?: 'default' | 'destructive'
    requiresInput?: 'tracking' | 'reason' | 'refund'
  }[] => {
    switch (order.status) {
      case 'pending_payment':
        return [
          { label: '결제 확인', status: 'paid' },
          { label: '취소', status: 'cancelled', variant: 'destructive', requiresInput: 'reason' },
          { label: '만료 처리', status: 'expired', variant: 'destructive' },
        ]
      case 'paid':
        return [
          { label: '제작 시작', status: 'in_production' },
          { label: '환불', status: 'refunded', variant: 'destructive', requiresInput: 'refund' },
        ]
      case 'in_production':
        return [
          { label: '배송 준비 완료', status: 'ready_to_ship' },
          { label: '환불', status: 'refunded', variant: 'destructive', requiresInput: 'refund' },
        ]
      case 'ready_to_ship':
        return [
          { label: '발송 완료', status: 'shipped', requiresInput: 'tracking' },
        ]
      case 'shipped':
        return [
          { label: '배송 완료', status: 'delivered' },
        ]
      case 'delivered':
        return [
          { label: '완료 처리', status: 'completed' },
        ]
      case 'expired':
        return [
          { label: '재결제 대기', status: 'pending_payment' },
        ]
      default:
        return []
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dotting-soft-cream)]">
        <p className="text-[var(--dotting-muted-text)]">로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dotting-soft-cream)]">
        <p className="text-red-600">오류: {error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--dotting-deep-navy)]">주문 관리</h1>
          <p className="text-[var(--dotting-muted-text)]">결제 확인 / 제작 / 배송 상태를 관리합니다</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)]' : ''}
          >
            전체 ({orders.length})
          </Button>
          {(['pending_payment', 'paid', 'in_production', 'ready_to_ship', 'shipped', 'delivered'] as OrderStatus[]).map((status) => {
            const count = orders.filter(o => o.status === status).length
            return (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? 'bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)]' : ''}
              >
                {STATUS_LABELS[status]} ({count})
              </Button>
            )
          })}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {(['pending_payment', 'paid', 'in_production', 'shipped', 'completed'] as OrderStatus[]).map((status) => {
            const count = orders.filter(o => o.status === status).length
            return (
              <Card key={status} className="bg-white">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--dotting-deep-navy)]">{count}</p>
                  <p className="text-sm text-[var(--dotting-muted-text)]">{STATUS_LABELS[status]}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-8 text-center">
                <p className="text-[var(--dotting-muted-text)]">주문이 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="bg-white">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-[var(--dotting-deep-navy)]">
                        {order.session?.subject_name || '이름 없음'}의 이야기
                      </CardTitle>
                      <p className="text-sm text-[var(--dotting-muted-text)]">
                        주문자: {order.session?.user?.name || order.session?.user?.email || '-'}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      {!order.is_active && (
                        <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-600">
                          비활성
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* 패키지/금액 정보 */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-[var(--dotting-deep-navy)]">주문 정보</h4>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">패키지:</span>{' '}
                        <span className="font-medium">{PACKAGE_LABELS[order.package]}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">금액:</span>{' '}
                        <span className="font-medium">{formatAmount(order.amount)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">결제방식:</span>{' '}
                        {order.payment_method === 'manual' ? '수동(계좌이체)' : order.payment_method || '-'}
                      </p>
                      {order.payment_note && (
                        <p className="text-sm">
                          <span className="text-[var(--dotting-muted-text)]">입금메모:</span> {order.payment_note}
                        </p>
                      )}
                    </div>

                    {/* 타임라인 */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-[var(--dotting-deep-navy)]">타임라인</h4>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">주문일:</span> {formatDate(order.created_at)}
                      </p>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">결제요청:</span> {formatDate(order.payment_requested_at)}
                      </p>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">결제확인:</span> {formatDate(order.paid_at)}
                      </p>
                      {order.shipped_at && (
                        <p className="text-sm">
                          <span className="text-[var(--dotting-muted-text)]">발송일:</span> {formatDate(order.shipped_at)}
                        </p>
                      )}
                    </div>

                    {/* 배송 정보 */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-[var(--dotting-deep-navy)]">배송 정보</h4>
                      {order.recipient_name ? (
                        <>
                          <p className="text-sm">
                            <span className="text-[var(--dotting-muted-text)]">수령인:</span> {order.recipient_name}
                          </p>
                          <p className="text-sm">
                            <span className="text-[var(--dotting-muted-text)]">연락처:</span> {order.shipping_phone || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="text-[var(--dotting-muted-text)]">주소:</span> {order.shipping_address || '-'}
                          </p>
                          {order.tracking_number && (
                            <p className="text-sm">
                              <span className="text-[var(--dotting-muted-text)]">송장:</span>{' '}
                              {CARRIER_OPTIONS.find(c => c.value === order.tracking_carrier)?.label || order.tracking_carrier}{' '}
                              {order.tracking_number}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-[var(--dotting-muted-text)]">배송 정보 없음</p>
                      )}
                    </div>
                  </div>

                  {/* 환불/취소 정보 */}
                  {(order.refund_reason || order.cancel_reason) && (
                    <div className="mt-4 p-3 bg-orange-50 rounded-md">
                      {order.refund_reason && (
                        <p className="text-sm text-orange-800">
                          <span className="font-medium">환불 사유:</span> {order.refund_reason}
                          {order.refund_amount && ` (${formatAmount(order.refund_amount)})`}
                        </p>
                      )}
                      {order.cancel_reason && (
                        <p className="text-sm text-orange-800">
                          <span className="font-medium">취소 사유:</span> {order.cancel_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-[var(--dotting-border)]">
                    {selectedOrder?.id === order.id ? (
                      <div className="space-y-4">
                        {/* 입력 폼 */}
                        {order.status === 'ready_to_ship' && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-[var(--dotting-deep-navy)] mb-1">
                                택배사 *
                              </label>
                              <select
                                value={trackingCarrier}
                                onChange={(e) => setTrackingCarrier(e.target.value)}
                                className="w-full h-10 px-3 border border-[var(--dotting-border)] rounded-md"
                              >
                                <option value="">선택</option>
                                {CARRIER_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[var(--dotting-deep-navy)] mb-1">
                                송장번호 *
                              </label>
                              <Input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="송장번호 입력"
                              />
                            </div>
                          </div>
                        )}

                        {order.status === 'pending_payment' && (
                          <div>
                            <label className="block text-sm font-medium text-[var(--dotting-deep-navy)] mb-1">
                              취소/만료 사유 (취소 시 필수)
                            </label>
                            <Input
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="사유 입력"
                            />
                          </div>
                        )}

                        {(order.status === 'paid' || order.status === 'in_production') && (
                          <div>
                            <label className="block text-sm font-medium text-[var(--dotting-deep-navy)] mb-1">
                              환불 사유 (환불 시 필수)
                            </label>
                            <Textarea
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              placeholder="환불 사유 입력"
                              rows={2}
                            />
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {getNextActions(order).map((action) => (
                            <Button
                              key={action.status}
                              variant={action.variant === 'destructive' ? 'outline' : 'default'}
                              onClick={() => {
                                // 입력 검증
                                if (action.requiresInput === 'tracking' && (!trackingCarrier || !trackingNumber)) {
                                  alert('택배사와 송장번호를 입력해주세요')
                                  return
                                }
                                if (action.requiresInput === 'reason' && action.status === 'cancelled' && !reason) {
                                  alert('취소 사유를 입력해주세요')
                                  return
                                }
                                if (action.requiresInput === 'refund' && !refundReason) {
                                  alert('환불 사유를 입력해주세요')
                                  return
                                }
                                
                                handleStatusChange(order.id, action.status, {
                                  reason: reason || undefined,
                                  tracking_carrier: trackingCarrier || undefined,
                                  tracking_number: trackingNumber || undefined,
                                  refund_reason: refundReason || undefined,
                                })
                              }}
                              disabled={actionLoading}
                              className={action.variant !== 'destructive' 
                                ? 'bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] hover:bg-[#C49660]'
                                : 'border-red-300 text-red-600 hover:bg-red-50'
                              }
                            >
                              {actionLoading ? '처리 중...' : action.label}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(null)
                              resetInputs()
                            }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {getNextActions(order).length > 0 && (
                          <Button
                            onClick={() => setSelectedOrder(order)}
                            className="bg-[var(--dotting-deep-navy)] text-white hover:bg-[#2A4A6F]"
                          >
                            상태 변경
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => window.open(`/dashboard/project/${order.session_id}`, '_blank')}
                        >
                          프로젝트 보기
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
