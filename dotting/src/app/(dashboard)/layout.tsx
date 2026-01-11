import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { LogoLink } from '@/components/ui/logo-link'

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
    // public.users 레코드 보장 (upsert)
    // 이미 있으면 업데이트, 없으면 생성
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      } as { id: string; email: string; name: string }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
    
    if (error && error.code !== '23505') { // 23505 = unique violation (정상)
      console.error('[DOTTING] Failed to ensure user profile:', error)
      // 실패해도 진행 (로그만 남김)
    }
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <LogoLink />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">{user.email}</span>
              <form action="/api/auth/signout" method="post">
                <button 
                  type="submit"
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
