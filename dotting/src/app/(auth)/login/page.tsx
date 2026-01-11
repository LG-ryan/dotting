'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight text-[var(--dotting-deep-navy)]">DOTTING</CardTitle>
        <CardDescription className="text-[var(--dotting-muted-text)]">
          소중한 이야기를 책으로 만들어드립니다
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
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
            {loading ? '로그인 중...' : '로그인'}
          </Button>
          <p className="text-sm text-center text-[var(--dotting-muted-text)]">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="font-medium text-[var(--dotting-deep-navy)] hover:underline">
              회원가입
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
