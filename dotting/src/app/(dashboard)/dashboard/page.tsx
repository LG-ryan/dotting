import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

async function getSessions() {
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

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return sessions || []
}

export default async function DashboardPage() {
  const sessions = await getSessions()

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">내 프로젝트</h1>
          <p className="text-slate-600 mt-1">소중한 이야기를 기록하고 책으로 만들어보세요</p>
        </div>
        <Link href="/dashboard/new">
          <Button className="bg-slate-900 hover:bg-slate-800">
            새 프로젝트 시작
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {sessions.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg 
                className="w-8 h-8 text-slate-400" 
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
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              아직 프로젝트가 없습니다
            </h3>
            <p className="text-slate-600 text-center mb-6 max-w-sm">
              첫 번째 프로젝트를 시작해서<br />
              소중한 분의 이야기를 기록해보세요
            </p>
            <Link href="/dashboard/new">
              <Button className="bg-slate-900 hover:bg-slate-800">
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
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      session.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : session.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {session.status === 'completed' ? '완료' : session.status === 'in_progress' ? '진행중' : '시작 전'}
                    </span>
                    <span className="text-sm text-slate-500">
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
