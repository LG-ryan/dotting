'use client'

/**
 * 주문 상태 표시 배지
 * 대시보드에서 결제/제작/배송 상태를 보여줌
 */

import type { OrderStatus } from '@/types/database'

interface OrderStatusBadgeProps {
  status: OrderStatus | null
  size?: 'sm' | 'md'
  className?: string
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  pending_payment: {
    label: '결제 대기',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    description: '아래 계좌로 입금해주시면 확인 후 시작됩니다',
  },
  paid: {
    label: '결제 완료',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    description: '이제 링크를 보낼 수 있어요',
  },
  in_production: {
    label: '제작 중',
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-100',
    description: '이야기를 책으로 만들고 있어요 ●●●',
  },
  ready_to_ship: {
    label: '배송 준비',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100',
    description: '책이 완성되어 배송 준비 중이에요',
  },
  shipped: {
    label: '배송 중',
    color: 'text-cyan-800',
    bgColor: 'bg-cyan-100',
    description: '책이 출발했어요!',
  },
  delivered: {
    label: '배송 완료',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    description: '책이 도착했어요',
  },
  completed: {
    label: '완료',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    description: '소중한 선물이 되길 바랍니다',
  },
  refunded: {
    label: '환불됨',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    description: '환불이 완료되었습니다',
  },
  cancelled: {
    label: '취소됨',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
    description: '주문이 취소되었습니다',
  },
  expired: {
    label: '만료됨',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    description: '결제 기한이 만료되었습니다',
  },
}

export function OrderStatusBadge({ status, size = 'md', className = '' }: OrderStatusBadgeProps) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-3 py-1 text-sm'
  
  if (!status) {
    return (
      <span className={`${sizeClasses} rounded-full font-medium bg-gray-100 text-gray-600 ${className}`}>
        주문 없음
      </span>
    )
  }

  const config = STATUS_CONFIG[status]

  return (
    <span className={`${sizeClasses} rounded-full font-medium ${config.bgColor} ${config.color} ${className}`}>
      {config.label}
    </span>
  )
}

export function OrderStatusCard({ status }: { status: OrderStatus | null }) {
  if (!status) {
    return (
      <div className="p-4 rounded-xl bg-[var(--dotting-soft-cream)] border border-[var(--dotting-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-[var(--dotting-deep-navy)]">결제 필요</p>
            <p className="text-sm text-[var(--dotting-muted-text)]">
              인터뷰를 시작하려면 먼저 결제해주세요
            </p>
          </div>
        </div>
      </div>
    )
  }

  const config = STATUS_CONFIG[status]
  
  // 상태별 아이콘
  const icons: Record<OrderStatus, React.ReactNode> = {
    pending_payment: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    paid: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    in_production: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    ready_to_ship: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    shipped: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    delivered: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    completed: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    refunded: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    cancelled: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    expired: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  }

  return (
    <div className={`p-4 rounded-xl ${config.bgColor}/30 border border-${config.bgColor}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center ${config.color}`}>
          {icons[status]}
        </div>
        <div>
          <p className={`font-medium ${config.color}`}>{config.label}</p>
          <p className="text-sm text-[var(--dotting-muted-text)]">
            {config.description}
          </p>
        </div>
      </div>
    </div>
  )
}

export { STATUS_CONFIG }
