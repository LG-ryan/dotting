import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }
  
  // public.users 레코드 보장 (upsert) - 트리거 실패 시 백업
  await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    }, {
      onConflict: 'id',
      ignoreDuplicates: false,
    })
  
  // 관리자 권한 확인 (fail-closed: 확실히 admin일 때만 허용)
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!userData || !['admin', 'operator'].includes(userData.role || '')) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)]">
      {/* Admin Header */}
      <header className="bg-[var(--dotting-deep-navy)] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/admin/print-queue" className="font-bold text-lg">
              DOTTING Admin
            </Link>
            <nav className="flex gap-4">
              <Link 
                href="/admin/orders" 
                className="text-white/80 hover:text-white transition-colors"
              >
                주문 관리
              </Link>
              <Link 
                href="/admin/print-queue" 
                className="text-white/80 hover:text-white transition-colors"
              >
                인쇄 관리
              </Link>
            </nav>
          </div>
          <Link 
            href="/dashboard" 
            className="text-white/80 hover:text-white text-sm"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </header>
      
      {/* Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
