'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Chapter {
  id: string
  order_index: number
  title: string
  content: string
}

interface OutputDraft {
  id: string
  title: string
  status: string
  created_at: string
}

interface Session {
  id: string
  subject_name: string
  subject_relation: string
}

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [draft, setDraft] = useState<OutputDraft | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentChapter, setCurrentChapter] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadPreview()
  }, [sessionId])

  const loadPreview = async () => {
    setLoading(true)

    // 세션 정보 로드
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionData) {
      setSession(sessionData)
    }

    // 최신 draft 로드
    const { data: draftData } = await supabase
      .from('output_drafts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (draftData) {
      setDraft(draftData)

      // 챕터 로드
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('*')
        .eq('output_draft_id', draftData.id)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

      if (chaptersData) {
        setChapters(chaptersData)
      }
    }

    setLoading(false)
  }

  const goToChapter = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapter(index)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">로딩 중...</div>
      </div>
    )
  }

  if (!draft || chapters.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          아직 정리된 이야기가 없습니다
        </h1>
        <p className="text-slate-600 mb-8">
          인터뷰를 더 진행하고 이야기를 정리해보세요
        </p>
        <Link href={`/dashboard/project/${sessionId}`}>
          <Button className="bg-slate-900 hover:bg-slate-800">
            인터뷰로 돌아가기
          </Button>
        </Link>
      </div>
    )
  }

  const chapter = chapters[currentChapter]

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{draft.title}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {session?.subject_relation} · {chapters.length}개의 챕터
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href={`/dashboard/project/${sessionId}`}>
            <Button variant="outline">인터뷰 계속하기</Button>
          </Link>
        </div>
      </div>

      {/* 책 미리보기 */}
      <div className="bg-amber-50 rounded-lg shadow-lg overflow-hidden">
        {/* 책 상단 장식 */}
        <div className="h-2 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200" />
        
        <div className="p-8 md:p-12">
          {/* 챕터 제목 */}
          <div className="text-center mb-8">
            <span className="text-sm text-amber-700 font-medium">
              Chapter {currentChapter + 1}
            </span>
            <h2 className="text-2xl font-serif font-bold text-slate-800 mt-2">
              {chapter.title}
            </h2>
          </div>

          {/* 챕터 내용 */}
          <div className="prose prose-slate max-w-none">
            <p className="text-lg leading-relaxed text-slate-700 whitespace-pre-wrap font-serif">
              {chapter.content}
            </p>
          </div>
        </div>

        {/* 페이지 네비게이션 */}
        <div className="border-t border-amber-200 px-8 py-4 flex justify-between items-center bg-amber-100/50">
          <Button
            variant="ghost"
            onClick={() => goToChapter(currentChapter - 1)}
            disabled={currentChapter === 0}
            className="text-amber-800 hover:text-amber-900 hover:bg-amber-200"
          >
            ← 이전
          </Button>
          
          <div className="flex space-x-2">
            {chapters.map((_, index) => (
              <button
                key={index}
                onClick={() => goToChapter(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentChapter
                    ? 'bg-amber-700'
                    : 'bg-amber-300 hover:bg-amber-400'
                }`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={() => goToChapter(currentChapter + 1)}
            disabled={currentChapter === chapters.length - 1}
            className="text-amber-800 hover:text-amber-900 hover:bg-amber-200"
          >
            다음 →
          </Button>
        </div>
      </div>

      {/* 챕터 목록 */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">목차</h3>
        <div className="space-y-2">
          {chapters.map((ch, index) => (
            <button
              key={ch.id}
              onClick={() => goToChapter(index)}
              className={`w-full text-left p-4 rounded-lg transition-colors ${
                index === currentChapter
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="text-sm opacity-70">Chapter {index + 1}</span>
              <p className="font-medium">{ch.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 상태 표시 */}
      <Card className="mt-8 p-6">
        <div className="flex justify-between items-center">
          <div>
            <span className={`text-sm px-3 py-1 rounded-full ${
              draft.status === 'draft' 
                ? 'bg-yellow-100 text-yellow-700'
                : draft.status === 'reviewed'
                ? 'bg-blue-100 text-blue-700'
                : draft.status === 'finalized'
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {draft.status === 'draft' ? 'AI 초안' 
                : draft.status === 'reviewed' ? '검토 완료'
                : draft.status === 'finalized' ? '최종 확정'
                : draft.status}
            </span>
            <p className="text-sm text-slate-600 mt-2">
              AI가 작성한 초안입니다. 내용을 검토하고 수정할 수 있습니다.
            </p>
          </div>
          <Button className="bg-[var(--dotting-deep-navy)] hover:bg-[var(--dotting-deep-navy)]/90 text-white font-medium px-6">
            수정하기
          </Button>
        </div>
      </Card>
    </div>
  )
}
