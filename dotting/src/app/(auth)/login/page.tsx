'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function LoginForm() {
  // [수정됨] 여기에 supabase 클라이언트를 생성하는 코드가 추가되었습니다.
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saveEmail, setSaveEmail] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const isVerified = searchParams.get('verified') === 'true'
  const autoEmail = searchParams.get('email')

  // 마지막 로그인 이메일 불러오기 (옵션 3)
  useEffect(() => {
    if (autoEmail) {
      setEmail(autoEmail)
    } else {
      const savedEmail = localStorage.getItem('dotting_last_email')
      if (savedEmail) {
        setEmail(savedEmail)
        setSaveEmail(true) // 저장된 이메일이 있으면 체크박스도 체크
      }
    }
  }, [autoEmail])

  // 인증 완료 시 자동 입장 처리
  useEffect(() => {
    if (isVerified) {
      const checkSession = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // 로그인 되어 있으면 2초 후 서재로 이동
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 2000)
        }
      }
      checkSession()
    }
  }, [isVerified, supabase, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 아이디 저장 옵션에 따라 이메일 저장/삭제
    if (saveEmail) {
      localStorage.setItem('dotting_last_email', email)
    } else {
      localStorage.removeItem('dotting_last_email')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // 로그인 상태 유지 옵션 (옵션 2)
        persistSession: rememberMe,
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  // 소셜 로그인 핸들러
  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden">
      <CardHeader className="space-y-3 text-center pt-8 pb-6">
        <div className="dotting-wordmark dotting-wordmark--lg mx-auto mb-2">
          <span className="dotting-wordmark-d">D</span>
          <span className="dotting-wordmark-otting">OTTING</span>
        </div>
        <CardDescription className="text-[var(--dotting-muted-gray)] text-base">
          소중한 이야기를 책으로 만들어드립니다
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-5 px-8">
          {/* 인증 완료 알림 */}
          {isVerified && (
            <div className="p-4 bg-[var(--dotting-soft-cream)] border-l-4 border-[var(--dotting-warm-amber)] rounded-xl flex items-start gap-3 animate-fade-in">
              <div className="text-[var(--dotting-warm-amber)] mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-[var(--dotting-deep-navy)]">이메일 인증 완료</h4>
                <p className="text-xs text-[var(--dotting-muted-gray)] mt-1">이제 서재에 입장하실 수 있습니다.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded-xl">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold text-[var(--dotting-deep-navy)]">
              이메일
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12 border-2 border-[var(--dotting-border)] rounded-xl focus:border-[var(--dotting-deep-navy)] focus:ring-0 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold text-[var(--dotting-deep-navy)]">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-12 border-2 border-[var(--dotting-border)] rounded-xl focus:border-[var(--dotting-deep-navy)] focus:ring-0 transition-colors"
            />
          </div>
          {/* 아이디 저장 & 로그인 상태 유지 체크박스 */}
          <div className="flex items-center gap-6 pt-1">
            <label htmlFor="save-email" className="flex items-center cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  id="save-email"
                  type="checkbox"
                  checked={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 border-2 border-[var(--dotting-border)] rounded bg-white peer-checked:bg-[var(--dotting-deep-navy)] peer-checked:border-[var(--dotting-deep-navy)] transition-all group-hover:border-[var(--dotting-deep-navy)] flex items-center justify-center">
                  {saveEmail && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="ml-2.5 text-sm text-[var(--dotting-muted-gray)] group-hover:text-[var(--dotting-deep-navy)] transition-colors">
                아이디 저장
              </span>
            </label>

            <label htmlFor="remember-me" className="flex items-center cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 border-2 border-[var(--dotting-border)] rounded bg-white peer-checked:bg-[var(--dotting-deep-navy)] peer-checked:border-[var(--dotting-deep-navy)] transition-all group-hover:border-[var(--dotting-deep-navy)] flex items-center justify-center">
                  {rememberMe && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="ml-2.5 text-sm text-[var(--dotting-muted-gray)] group-hover:text-[var(--dotting-deep-navy)] transition-colors">
                로그인 상태 유지
              </span>
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-6 px-8 pb-8 pt-6">
          <Button
            type="submit"
            size="default"
            className="w-full bg-[var(--dotting-warm-gold)] hover:bg-[#C49660] text-[var(--dotting-deep-navy)] font-bold rounded-xl shadow-sm transition-all"
            disabled={loading}
          >
            {loading ? '입장 중...' : '서재 들어가기'}
          </Button>

          {/* 구분선 */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--dotting-border)]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[var(--dotting-muted-gray)]">또는</span>
            </div>
          </div>

          {/* 소셜 로그인 아이콘 */}
          <div className="flex items-center justify-center gap-5 py-2">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-14 h-14 flex items-center justify-center bg-white border-2 border-[var(--dotting-border)] rounded-full hover:border-[var(--dotting-deep-navy)] hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Google로 로그인"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('kakao')}
              disabled={loading}
              className="w-14 h-14 flex items-center justify-center bg-white border-2 border-[var(--dotting-border)] rounded-full hover:border-[var(--dotting-deep-navy)] hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Kakao로 로그인"
            >
              <svg className="w-6 h-6" viewBox="0 0 208 191" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M104 0C46.562 0 0 35.817 0 80c0 28.688 19.016 53.914 47.629 67.766-1.974 7.234-12.725 46.218-13.146 49.524-.527 4.138 1.527 4.09 3.223 2.98 1.335-.871 21.48-14.235 31.308-20.829 11.633 2.388 23.876 3.649 36.986 3.649 57.438 0 104-35.817 104-80S161.438 0 104 0z" fill="#3C1E1E"/>
              </svg>
            </button>
          </div>

          <div className="pt-3 text-center border-t border-[var(--dotting-border)]">
            <p className="text-sm text-[var(--dotting-muted-gray)]">
              아직 서재가 없으신가요?{' '}
              <Link href="/signup" className="font-semibold text-[var(--dotting-deep-navy)] hover:underline underline-offset-2">
                새 책 꺼내기
              </Link>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  )
}