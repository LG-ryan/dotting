'use client'

import { LogoLink } from '@/components/ui/logo-link'

interface DashboardHeaderProps {
  userEmail: string
  isHeritage?: boolean
}

export function DashboardHeader({ userEmail, isHeritage }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--dotting-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <LogoLink />
            <div className="h-4 w-px bg-[var(--dotting-border)]" />
            <span className="text-sm font-serif font-medium text-[var(--dotting-deep-navy)] tracking-wide">
              나의 서재
            </span>
          </div>
          <div className="flex items-center space-x-6">
            {/* Heritage 배지 (프로필 영역 내부) */}
            {isHeritage && (
              <span className="inline-flex items-center px-2 py-1 text-[10px] font-bold tracking-widest text-[var(--dotting-warm-amber)] border border-[var(--dotting-warm-amber)] rounded-full">
                HERITAGE
              </span>
            )}
            <span className="text-sm text-[var(--dotting-muted-gray)] font-medium">{userEmail}</span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] transition-colors font-medium"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}
