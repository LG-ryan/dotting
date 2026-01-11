'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // users 테이블에 사용자 정보 저장
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: name,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Card className="border-0 shadow-xl bg-white">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-[var(--dotting-deep-navy)]">이메일을 확인하세요</CardTitle>
          <CardDescription className="text-[var(--dotting-muted-text)]">
            {email}로 인증 메일을 보냈습니다.
            <br />
            메일의 링크를 클릭하여 가입을 완료해주세요.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full h-11 border-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] hover:bg-[var(--dotting-warm-gold)]/10">
              로그인 페이지로 돌아가기
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight text-[var(--dotting-deep-navy)]">DOTTING</CardTitle>
        <CardDescription className="text-[var(--dotting-muted-text)]">
          지금 시작하세요. 첫 번째 이야기가 기다립니다.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-[var(--dotting-deep-navy)]">
              이름
            </label>
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 border-[var(--dotting-border)] focus:border-[var(--dotting-warm-gold)] focus:ring-[var(--dotting-warm-gold)]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-[var(--dotting-deep-navy)]">
              이메일
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border-[var(--dotting-border)] focus:border-[var(--dotting-warm-gold)] focus:ring-[var(--dotting-warm-gold)]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-[var(--dotting-deep-navy)]">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 border-[var(--dotting-border)] focus:border-[var(--dotting-warm-gold)] focus:ring-[var(--dotting-warm-gold)]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--dotting-deep-navy)]">
              비밀번호 확인
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-11 border-[var(--dotting-border)] focus:border-[var(--dotting-warm-gold)] focus:ring-[var(--dotting-warm-gold)]"
            />
          </div>
          {/* 안심 문구 */}
          <p className="text-xs text-center text-[var(--dotting-muted-text)]">
            링크로 보내기 전까지는 아무도 볼 수 없어요
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full h-11 bg-[var(--dotting-warm-gold)] hover:bg-[#C49660] text-[var(--dotting-deep-navy)] font-semibold"
            disabled={loading}
          >
            {loading ? '가입 중...' : '회원가입'}
          </Button>
          <p className="text-sm text-center text-[var(--dotting-muted-text)]">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-medium text-[var(--dotting-deep-navy)] hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
