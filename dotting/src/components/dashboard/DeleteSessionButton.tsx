'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { triggerHaptic } from '@/lib/haptic'

interface DeleteSessionButtonProps {
  sessionId: string
  sessionName: string
  onDeleteSuccess?: () => void
  onDeleteError?: (error: string) => void
}

export function DeleteSessionButton({ 
  sessionId, 
  sessionName,
  onDeleteSuccess,
  onDeleteError 
}: DeleteSessionButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 감지
  useEffect(() => {
    if (!showConfirm) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowConfirm(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showConfirm])

  const handleDelete = async () => {
    setDeleting(true)
    triggerHaptic('medium')
    
    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        triggerHaptic('light')
        setShowConfirm(false)
        router.refresh()
        onDeleteSuccess?.()
      } else {
        const error = await response.text()
        onDeleteError?.(error || '삭제에 실패했습니다')
      }
    } catch (error) {
      onDeleteError?.('네트워크 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative" ref={buttonRef}>
      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowConfirm(!showConfirm)
          triggerHaptic('light')
        }}
        className="p-2 rounded-lg text-[var(--dotting-muted-gray)] 
                   hover:text-[var(--dotting-deep-navy)] hover:bg-gray-100
                   transition-colors cursor-pointer"
        title="프로젝트 삭제"
        aria-label="프로젝트 삭제"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* 드롭다운 확인 카드 */}
      {showConfirm && (
        <div 
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[var(--dotting-border)] p-4 z-50"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          {/* 제목 */}
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-[var(--dotting-deep-navy)] mb-1">
              정말 삭제하시겠어요?
            </h4>
            <p className="text-xs text-[var(--dotting-muted-gray)] leading-relaxed">
              <span className="font-medium text-[var(--dotting-deep-navy)]">{sessionName}</span>의 모든 데이터가 영구 삭제됩니다.
            </p>
          </div>
          
          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            {/* 취소 */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowConfirm(false)
                triggerHaptic('light')
              }}
              className="flex-1 h-9 px-3 rounded-lg 
                         border border-[var(--dotting-border)] 
                         text-sm font-medium text-[var(--dotting-deep-navy)]
                         hover:bg-gray-50
                         active:scale-[0.98]
                         transition-all"
              disabled={deleting}
            >
              취소
            </button>
            
            {/* 삭제 */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDelete()
              }}
              disabled={deleting}
              className="flex-1 h-9 px-3 rounded-lg 
                         bg-red-600 text-white
                         text-sm font-semibold
                         hover:bg-red-700
                         active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all"
            >
              {deleting ? '삭제 중' : '삭제'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
