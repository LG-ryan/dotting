import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  let userEmail = ''
  let isSocialLogin = false

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      userEmail = data.user?.email || ''
      
      // 소셜 로그인 여부 확인 (app_metadata에 provider 정보 있음)
      const provider = data.user.app_metadata?.provider
      isSocialLogin = provider === 'google' || provider === 'kakao'
    }
  }

  // 소셜 로그인이면 바로 대시보드로
  if (isSocialLogin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 이메일 인증이면 로그인 페이지로 (인증 완료 플래그 + 이메일 자동완성)
  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set('verified', 'true')
  if (userEmail) {
    redirectUrl.searchParams.set('email', userEmail)
  }

  return NextResponse.redirect(redirectUrl)
}
