'use client'

/**
 * DOTTING Admin Print Queue
 * 
 * 인쇄 주문 관리 페이지
 * - 상태별 필터링
 * - 상태 전이 (pending → printing → shipped → delivered)
 * - 송장 번호 입력
 * - 클레임 처리
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PrintOrderStatus } from '@/types/database'

interface PrintOrder {
  id: string
  compilation_id: string
  status: PrintOrderStatus
  recipient_name: string
  recipient_phone: string
  shipping_address: string
  shipping_address_detail: string | null
  postal_code: string
  tracking_carrier: string | null
  tracking_number: string | null
  claim_reason: string | null
  admin_note: string | null
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
  // 조인된 데이터
  compilation?: {
    pdf_snapshot_version: number | null
    session?: {
      id: string
      subject_name: string
      user?: {
        email: string
        name: string | null
      }
    }
  }
}

const STATUS_LABELS: Record<PrintOrderStatus, string> = {
  pending: '인쇄 대기',
  printing: '인쇄 중',
  shipped: '발송 완료',
  delivered: '배송 완료',
  claim_opened: '클레임 접수',
  claim_resolved: '클레임 해결',
}

const STATUS_COLORS: Record<PrintOrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  printing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  claim_opened: 'bg-red-100 text-red-800',
  claim_resolved: 'bg-gray-100 text-gray-800',
}

const CARRIER_OPTIONS = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'post', label: '우체국' },
  { value: 'logen', label: '로젠택배' },
]

export default function PrintQueuePage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PrintOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<PrintOrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<PrintOrder | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // 송장 입력용 상태
  const [trackingCarrier, setTrackingCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.set('status', filterStatus)
      }
      
      const res = await fetch(`/api/admin/print-orders?${params}`)
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

  const handleStatusChange = async (orderId: string, toStatus: PrintOrderStatus, extraData?: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/print-orders/${orderId}/status`, {
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
      
      // 성공 시 목록 새로고침
      await fetchOrders()
      setSelectedOrder(null)
      setTrackingCarrier('')
      setTrackingNumber('')
      setAdminNote('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status')
    } finally {
      setActionLoading(false)
    }
  }

  const getNextActions = (order: PrintOrder): { label: string; status: PrintOrderStatus; requiresInput?: boolean }[] => {
    switch (order.status) {
      case 'pending':
        return [{ label: '인쇄 시작', status: 'printing' }]
      case 'printing':
        return [{ label: '발송 완료', status: 'shipped', requiresInput: true }]
      case 'shipped':
        return [
          { label: '배송 완료', status: 'delivered' },
          { label: '클레임 접수', status: 'claim_opened' },
        ]
      case 'delivered':
        return [{ label: '클레임 접수', status: 'claim_opened' }]
      case 'claim_opened':
        return [{ label: '클레임 해결', status: 'claim_resolved' }]
      default:
        return []
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
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
          <h1 className="text-2xl font-bold text-[var(--dotting-deep-navy)]">인쇄 주문 관리</h1>
          <p className="text-[var(--dotting-muted-text)]">인쇄/배송 상태를 관리합니다</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)]' : ''}
          >
            전체
          </Button>
          {(Object.keys(STATUS_LABELS) as PrintOrderStatus[]).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status)}
              className={filterStatus === status ? 'bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)]' : ''}
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {(Object.keys(STATUS_LABELS) as PrintOrderStatus[]).map((status) => {
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
                        {order.compilation?.session?.subject_name || '이름 없음'}의 이야기
                      </CardTitle>
                      <p className="text-sm text-[var(--dotting-muted-text)]">
                        주문자: {order.compilation?.session?.user?.name || order.compilation?.session?.user?.email || '-'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 배송 정보 */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-[var(--dotting-deep-navy)]">배송 정보</h4>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">수령인:</span> {order.recipient_name}
                      </p>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">연락처:</span> {order.recipient_phone}
                      </p>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">주소:</span> [{order.postal_code}] {order.shipping_address}
                        {order.shipping_address_detail && ` ${order.shipping_address_detail}`}
                      </p>
                    </div>

                    {/* 주문 정보 */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-[var(--dotting-deep-navy)]">주문 정보</h4>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">스냅샷 버전:</span> v{order.compilation?.pdf_snapshot_version || '-'}
                      </p>
                      <p className="text-sm">
                        <span className="text-[var(--dotting-muted-text)]">주문일:</span> {formatDate(order.created_at)}
                      </p>
                      {order.tracking_number && (
                        <p className="text-sm">
                          <span className="text-[var(--dotting-muted-text)]">송장:</span>{' '}
                          {CARRIER_OPTIONS.find(c => c.value === order.tracking_carrier)?.label || order.tracking_carrier}{' '}
                          {order.tracking_number}
                        </p>
                      )}
                      {order.admin_note && (
                        <p className="text-sm">
                          <span className="text-[var(--dotting-muted-text)]">메모:</span> {order.admin_note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-[var(--dotting-border)]">
                    {selectedOrder?.id === order.id ? (
                      <div className="space-y-4">
                        {/* 송장 입력 폼 (shipped 전환 시) */}
                        {order.status === 'printing' && (
                          <div className="grid md:grid-cols-3 gap-4">
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
                            <div>
                              <label className="block text-sm font-medium text-[var(--dotting-deep-navy)] mb-1">
                                메모
                              </label>
                              <Input
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="관리자 메모"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {getNextActions(order).map((action) => (
                            <Button
                              key={action.status}
                              onClick={() => {
                                if (action.requiresInput && (!trackingCarrier || !trackingNumber)) {
                                  alert('택배사와 송장번호를 입력해주세요')
                                  return
                                }
                                handleStatusChange(order.id, action.status, {
                                  tracking_carrier: trackingCarrier || undefined,
                                  tracking_number: trackingNumber || undefined,
                                  admin_note: adminNote || undefined,
                                })
                              }}
                              disabled={actionLoading}
                              className="bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] hover:bg-[#C49660]"
                            >
                              {actionLoading ? '처리 중...' : action.label}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => setSelectedOrder(null)}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
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
                          onClick={() => window.open(`/dashboard/project/${order.compilation?.session?.id}/compilation`, '_blank')}
                        >
                          컴파일 보기
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
