import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/payment/OrderStatusBadge'
import { DeleteSessionButton } from '@/components/dashboard/DeleteSessionButton'
import type { OrderPaymentStatus } from '@/types/database'

// 캐싱 비활성화 - 항상 최신 데이터 조회
export const dynamic = 'force-dynamic'

interface SessionWithOrder {
  id: string
  subject_name: string
  subject_relation: string
  mode: string
  status: string
  created_at: string
  activeOrder?: {
    id: string
    status: OrderPaymentStatus
    package_type: string
    amount: number
  } | null
}

async function getSessions(): Promise<SessionWithOrder[]> {
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

  if (!user) return []

  // 세션만 먼저 조회 (orders join 제거 - RLS 문제 회피)
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id, subject_name, subject_relation, mode, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 디버깅 로그
  console.log('[DOTTING Dashboard] user.id:', user.id)
  console.log('[DOTTING Dashboard] sessions:', sessions?.length || 0, 'error:', sessionsError)

  if (!sessions || sessions.length === 0) return []

  // 각 세션의 활성 주문 별도 조회
  const sessionsWithOrders = await Promise.all(
    sessions.map(async (session) => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, status, package_type, amount')
        .eq('session_id', session.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      return {
        id: session.id,
        subject_name: session.subject_name,
        subject_relation: session.subject_relation,
        mode: session.mode,
        status: session.status,
        created_at: session.created_at,
        activeOrder: orderData ? {
          id: orderData.id,
          status: orderData.status as OrderPaymentStatus,
          package_type: orderData.package_type,
          amount: orderData.amount,
        } : null,
      }
    })
  )

  return sessionsWithOrders
}

export default async function DashboardPage() {
  const sessions = await getSessions()

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <div className="flex justify-between items-end border-b border-[var(--dotting-border)] pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-[var(--dotting-deep-navy)] mb-2">나의 서재</h1>
          <p className="text-[var(--dotting-muted-gray)]">
            당신의 소중한 기억들이 이곳에 모여 있습니다.
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button size="default" className="dotting-btn-primary shadow-lg hover:shadow-xl transition-all">
            <span className="mr-2 text-lg">+</span> 새 이야기 기록하기
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-[var(--dotting-border)] shadow-sm">
          <div className="w-20 h-20 bg-[var(--dotting-soft-cream)] rounded-full flex items-center justify-center mb-6 text-[var(--dotting-warm-amber)]">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-serif font-bold text-[var(--dotting-deep-navy)] mb-3">
            아직 기록된 이야기가 없습니다
          </h3>
          <p className="text-[var(--dotting-muted-gray)] text-center mb-8 max-w-sm leading-relaxed">
            첫 번째 책을 펼쳐보세요.<br />
            소중한 분의 이야기가 영원히 남을 수 있도록 도와드릴게요.
          </p>
          <Link href="/dashboard/new">
            <Button size="default" variant="outline" className="border-[var(--dotting-deep-navy)] text-[var(--dotting-deep-navy)] hover:bg-[var(--dotting-soft-cream)]">
              첫 번째 이야기 시작하기
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sessions.map((session) => (
            <div key={session.id} className="group relative">
              <Link href={`/dashboard/project/${session.id}`}>
                {/* Book Cover Card */}
                <div className="bg-white rounded-r-xl rounded-l-sm border border-[var(--dotting-border)] border-l-4 border-l-[var(--dotting-deep-navy)] shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col overflow-hidden group-hover:-translate-y-1">

                  {/* Card Header */}
                  <div className="p-6 pb-4 flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${session.status === 'completed'
                            ? 'bg-[var(--dotting-ocean-teal)]/10 text-[var(--dotting-ocean-teal)] border-[var(--dotting-ocean-teal)]/20'
                            : 'bg-[var(--dotting-warm-amber)]/10 text-[var(--dotting-warm-amber)] border-[var(--dotting-warm-amber)]/20'
                          }`}>
                          {session.status === 'completed' ? '완료됨' : '집필 중'}
                        </span>
                        {session.activeOrder && (
                          <OrderStatusBadge status={session.activeOrder.status} size="sm" />
                        )}
                      </div>
                      <h3 className="text-xl font-serif font-bold text-[var(--dotting-deep-navy)] truncate leading-tight mb-1">
                        {session.subject_name}
                      </h3>
                      <p className="text-sm text-[var(--dotting-muted-gray)]">
                        {session.subject_relation}의 이야기
                      </p>
                    </div>

                    {/* Delete Button (Prevent Link Click) */}
                    <DeleteSessionButton
                      sessionId={session.id}
                      sessionName={session.subject_name}
                    />
                  </div>

                  {/* Divider */}
                  <div className="px-6">
                    <div className="h-px bg-[var(--dotting-border)] w-full" />
                  </div>

                  {/* Card Footer */}
                  <div className="p-6 pt-4 mt-auto flex justify-between items-center text-xs text-[var(--dotting-muted-gray)]">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(session.created_at).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="font-medium text-[var(--dotting-deep-navy)] group-hover:underline decoration-1 underline-offset-2">
                      이어쓰기 →
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
