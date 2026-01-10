import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, expiresInDays } = body

    if (!sessionId) {
      return NextResponse.json({ error: '세션 ID가 필요합니다.' }, { status: 400 })
    }

    // 사용자 인증 확인
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 세션 소유권 확인
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, share_token')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 기존 토큰이 있으면 반환
    if (session.share_token) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return NextResponse.json({
        token: session.share_token,
        shareUrl: `${baseUrl}/respond/${session.share_token}`,
        isExisting: true,
      })
    }

    // 새 토큰 생성
    const shareToken = crypto.randomBytes(32).toString('base64url')
    
    // 만료일 계산 (기본 30일)
    const days = expiresInDays || 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)

    // 토큰 저장
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        share_token: shareToken,
        share_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Failed to save share token:', updateError)
      return NextResponse.json(
        { error: '공유 링크 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      token: shareToken,
      shareUrl: `${baseUrl}/respond/${shareToken}`,
      expiresAt: expiresAt.toISOString(),
      isExisting: false,
    })
  } catch (error) {
    console.error('Failed to create share link:', error)
    return NextResponse.json(
      { error: '공유 링크 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 공유 링크 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: '세션 ID가 필요합니다.' }, { status: 400 })
    }

    // 사용자 인증 확인
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 세션 조회
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, share_token, share_token_expires_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (!session.share_token) {
      return NextResponse.json({ hasShareLink: false })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      hasShareLink: true,
      token: session.share_token,
      shareUrl: `${baseUrl}/respond/${session.share_token}`,
      expiresAt: session.share_token_expires_at,
    })
  } catch (error) {
    console.error('Failed to get share link:', error)
    return NextResponse.json(
      { error: '공유 링크 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
