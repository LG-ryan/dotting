import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

/**
 * 사용자 패키지 타입 조회 (Heritage 차별화용)
 */
async function getUserPackage(userId: string): Promise<'heritage' | null> {
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 무시
          }
        },
      },
    }
  )

  // 사용자의 가장 최근 주문에서 패키지 타입 확인
  const { data: order } = await supabase
    .from('orders')
    .select('package_type')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return order?.package_type === 'premium' ? 'heritage' : null
}

/**
 * 사용자 정보 조회 + public.users 자동 생성 (OAuth/매직링크 대응)
 * 트리거 실패 시 백업 방어
 */
async function getUser(): Promise<User | null> {
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 무시
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // public.users 존재 확인 (트리거가 자동 생성했는지 체크)
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
      console.warn('[DOTTING] Failed to check user profile:', selectError.message)
    }

    // 사용자가 없으면 RPC로 동기화 시도 (트리거 백업)
    if (!existingUser) {
      console.log('[DOTTING] User profile not found, syncing via RPC...')
      const { data: syncResult, error: rpcError } = await supabase
        .rpc('sync_user_profile')

      if (rpcError) {
        console.error('[DOTTING] Failed to sync user profile:', rpcError.message)
      } else if (syncResult && !syncResult.success) {
        console.error('[DOTTING] User sync failed:', syncResult.error)
      } else {
        console.log('[DOTTING] User profile synced successfully')
      }
    }

    // 디버깅: 사용자 ID 확인
    console.log('[DOTTING Layout] Logged in user:', user.id, user.email)
  }

  return user
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  // Heritage 패키지 확인
  const userPackage = await getUserPackage(user.id)
  const isHeritage = userPackage === 'heritage'

  return (
    <div 
      className={`min-h-screen bg-[var(--dotting-soft-cream)] relative ${isHeritage ? 'heritage' : ''}`}
      style={isHeritage ? {
        // v1.2: Heritage 미세 타이포 조정 (0.05unit 행간 증가)
        '--line-height-body': '1.75',
      } as React.CSSProperties : undefined}
    >
      {/* Paper Texture Overlay */}
      <div className="texture-overlay" />

      {/* Header */}
      <DashboardHeader 
        userEmail={user.email || ''} 
        isHeritage={isHeritage}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </main>
    </div>
  )
}
