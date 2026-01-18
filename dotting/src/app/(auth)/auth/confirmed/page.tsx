'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'

export default function AuthConfirmedPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dotting-soft-cream)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--dotting-warm-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--dotting-muted-text)]">확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        {user ? (
          <>
            {/* 성공 */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--dotting-deep-navy)] mb-2">
              이메일 인증 완료!
            </h1>
            <p className="text-[var(--dotting-muted-text)] mb-6">
              회원가입이 완료되었습니다.<br />
              이제 DOTTING을 시작할 수 있어요.
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              size="default"
              className="w-full bg-[var(--dotting-deep-navy)] text-white hover:bg-[#2A4A6F]"
            >
              대시보드로 이동
            </Button>
          </>
        ) : (
          <>
            {/* 실패 */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--dotting-deep-navy)] mb-2">
              인증 실패
            </h1>
            <p className="text-[var(--dotting-muted-text)] mb-6">
              인증 링크가 만료되었거나 잘못되었습니다.<br />
              다시 시도해주세요.
            </p>
            <Button
              onClick={() => router.push('/login')}
              size="default"
              className="w-full bg-[var(--dotting-deep-navy)] text-white hover:bg-[#2A4A6F]"
            >
              로그인 페이지로
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
