'use client'

import { ReactNode, useEffect } from 'react'
import { triggerHaptic } from '@/lib/haptic'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnOverlay?: boolean
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  size = 'sm',
  closeOnOverlay = true 
}: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        triggerHaptic('light')
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl'
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {/* 배경 오버레이 */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (closeOnOverlay) {
            onClose()
            triggerHaptic('light')
          }
        }}
        aria-label="모달 닫기"
      />
      
      {/* 모달 컨텐츠 */}
      <div 
        className={`
          relative bg-white rounded-2xl shadow-xl w-full
          ${sizeClasses[size]}
          animate-in zoom-in-95 fade-in duration-200
        `}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  children: ReactNode
  onClose?: () => void
  showCloseButton?: boolean
}

export function ModalHeader({ children, onClose, showCloseButton = true }: ModalHeaderProps) {
  return (
    <div className="relative px-6 pt-6 pb-4 border-b border-[var(--dotting-border)]">
      {children}
      
      {showCloseButton && onClose && (
        <button
          onClick={() => {
            onClose()
            triggerHaptic('light')
          }}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center 
                     rounded-full text-[var(--dotting-muted-gray)] 
                     hover:text-[var(--dotting-deep-navy)] hover:bg-[var(--dotting-warm-gray)]
                     transition-colors touch-action-manipulation"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[24px] leading-[1.35] font-bold text-[var(--dotting-deep-navy)] pr-8">
      {children}
    </h3>
  )
}

export function ModalDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] leading-[1.6] text-[var(--dotting-muted-gray)] mt-2">
      {children}
    </p>
  )
}

export function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-6">
      {children}
    </div>
  )
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 pb-6 flex gap-3">
      {children}
    </div>
  )
}

interface ModalButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'destructive'
  disabled?: boolean
  className?: string
}

export function ModalButton({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  className = ''
}: ModalButtonProps) {
  const variantClasses = {
    primary: `
      bg-[var(--dotting-deep-navy)] text-white
      hover:bg-[#2A4A6F]
    `,
    ghost: `
      border border-[var(--dotting-border)]
      text-[var(--dotting-deep-navy)]
      hover:bg-[var(--dotting-warm-gray)]
    `,
    destructive: `
      bg-[var(--dotting-rose-pink)] text-white
      hover:bg-[#DC2F4E]
    `
  }

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.()
        triggerHaptic('light')
      }}
      disabled={disabled}
      className={`
        flex-1 h-14 px-4 rounded-xl
        text-[17px] font-semibold
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all touch-action-manipulation
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
