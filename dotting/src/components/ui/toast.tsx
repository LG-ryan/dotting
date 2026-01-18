'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { triggerHaptic } from '@/lib/haptic'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    duration: number = 3000
  ) => {
    const id = Math.random().toString(36).substring(7)
    
    // 햅틱 피드백
    if (type === 'success') {
      triggerHaptic('light')
    } else if (type === 'error') {
      triggerHaptic('medium')
    }

    const newToast: Toast = { id, type, message, duration }
    setToasts(prev => [...prev, newToast])

    // 자동 제거
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id)
      }, duration)
    }
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-[var(--dotting-ocean-teal)]',
          border: 'border-[var(--dotting-ocean-teal)]',
          icon: '✓'
        }
      case 'error':
        return {
          bg: 'bg-[var(--dotting-rose-pink)]',
          border: 'border-[var(--dotting-rose-pink)]',
          icon: '⚠'
        }
      case 'warning':
        return {
          bg: 'bg-[var(--dotting-warm-amber)]',
          border: 'border-[var(--dotting-warm-amber)]',
          icon: '⚠'
        }
      case 'info':
      default:
        return {
          bg: 'bg-[var(--dotting-deep-navy)]',
          border: 'border-[var(--dotting-deep-navy)]',
          icon: '●'
        }
    }
  }

  const styles = getStyles()

  return (
    <div
      className={`
        ${styles.bg} ${styles.border}
        text-white
        px-6 py-4 rounded-xl
        border-2
        shadow-lg
        pointer-events-auto
        animate-in slide-in-from-bottom-5 fade-in
        max-w-md w-full mx-4
      `}
      role="alert"
    >
      <div className="flex items-center gap-3">
        {/* 아이콘 */}
        <span className="text-[20px] flex-shrink-0">
          {styles.icon}
        </span>
        
        {/* 메시지 */}
        <p className="text-[17px] leading-[1.6] font-medium flex-1">
          {toast.message}
        </p>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center
                     hover:bg-white/20 rounded-full transition-colors"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
