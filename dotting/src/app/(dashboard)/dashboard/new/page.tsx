'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type SessionMode = 'relaxed' | 'dday' | 'together'

export default function NewProjectPage() {
  const [subjectName, setSubjectName] = useState('')
  const [subjectRelation, setSubjectRelation] = useState('')
  const [mode, setMode] = useState<SessionMode>('together')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('로그인이 필요합니다')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        subject_name: subjectName,
        subject_relation: subjectRelation,
        mode: mode,
        status: 'in_progress',
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/project/${data.id}`)
  }

  const modeOptions = [
    {
      id: 'together' as SessionMode,
      title: '함께하기',
      description: '가족과 함께 직접 인터뷰하며 기록합니다',
      recommended: true,
    },
    {
      id: 'relaxed' as SessionMode,
      title: '여유롭게',
      description: '시간 제한 없이 천천히 진행합니다',
      recommended: false,
    },
    {
      id: 'dday' as SessionMode,
      title: 'D-Day',
      description: '특별한 날짜에 맞춰 빠르게 완성합니다',
      recommended: false,
    },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">새 프로젝트 시작</h1>
        <p className="text-slate-600 mt-1">소중한 분의 이야기를 기록해보세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {/* 대상자 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">누구의 이야기인가요?</CardTitle>
            <CardDescription>
              이야기를 들려주실 분의 정보를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="subjectName" className="text-sm font-medium text-slate-700">
                이름
              </label>
              <Input
                id="subjectName"
                type="text"
                placeholder="예: 김영희"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="subjectRelation" className="text-sm font-medium text-slate-700">
                나와의 관계
              </label>
              <Input
                id="subjectRelation"
                type="text"
                placeholder="예: 어머니, 아버지, 할머니"
                value={subjectRelation}
                onChange={(e) => setSubjectRelation(e.target.value)}
                required
                className="h-11"
              />
            </div>
          </CardContent>
        </Card>

        {/* 모드 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">어떻게 진행할까요?</CardTitle>
            <CardDescription>
              상황에 맞는 진행 방식을 선택해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modeOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    mode === option.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={option.id}
                    checked={mode === option.id}
                    onChange={(e) => setMode(e.target.value as SessionMode)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-slate-900">{option.title}</span>
                      {option.recommended && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-slate-900 text-white rounded">
                          추천
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-11 px-6"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={loading || !subjectName || !subjectRelation}
            className="h-11 px-6 bg-[var(--dotting-deep-navy)] text-white hover:bg-[#2A4A6F] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '프로젝트 시작'}
          </Button>
        </div>
      </form>
    </div>
  )
}
