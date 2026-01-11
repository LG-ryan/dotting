import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/payment/OrderStatusBadge'
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">내 프로젝트</h1>
          <p className="text-muted-foreground mt-1">소중한 이야기를 기록하고 책으로 만들어보세요</p>
        </div>
        <Link href="/dashboard/new">
          <Button>
            새 프로젝트 시작
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {sessions.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg 
                className="w-8 h-8 text-muted-foreground" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              아직 프로젝트가 없습니다
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              첫 번째 프로젝트를 시작해서<br />
              소중한 분의 이야기를 기록해보세요
            </p>
            <Link href="/dashboard/new">
              <Button>
                첫 프로젝트 시작하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Link key={session.id} href={`/dashboard/project/${session.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{session.subject_name}</CardTitle>
                  <CardDescription>
                    {session.subject_relation} · {session.mode === 'together' ? '함께하기' : session.mode === 'dday' ? 'D-Day' : '여유롭게'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        session.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : session.status === 'in_progress'
                          ? 'bg-primary/20 text-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {session.status === 'completed' ? '완료' : session.status === 'in_progress' ? '진행중' : '시작 전'}
                      </span>
                      {session.activeOrder && (
                        <OrderStatusBadge status={session.activeOrder.status} size="sm" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
