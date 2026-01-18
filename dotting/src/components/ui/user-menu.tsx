'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UserMenuProps {
  userEmail: string
}

export function UserMenu({ userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">{userEmail}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[var(--dotting-border)] py-2 z-50">
          <Link 
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2.5 text-sm text-[var(--dotting-deep-navy)] hover:bg-[var(--dotting-soft-cream)] transition-colors"
          >
            나의 서재
          </Link>
          <div className="h-px bg-[var(--dotting-border)] my-1" />
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--dotting-muted-gray)] hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
