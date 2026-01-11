'use client'

/**
 * DOTTING Compilation Page - 책 검수/편집/PDF
 * 
 * 상태에 따라 다른 뷰를 표시:
 * - pending_review ~ approved_for_edit: CompilationViewer
 * - approved_for_edit (에디터 모드): CompilationEditor
 * - approved_for_pdf: PdfPreview
 * - approved_for_print ~ printed: CompilationViewer (읽기 전용)
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import CompilationViewer from '@/components/compilation/CompilationViewer'
import CompilationEditor from '@/components/compilation/CompilationEditor'
import type { ReviewStatus } from '@/types/database'

// @react-pdf/renderer는 SSR에서 작동하지 않으므로 dynamic import 필수
const PdfPreview = dynamic(
  () => import('@/components/compilation/PdfPreview'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="dotting-dots dotting-dots--loading dotting-dots--lg mx-auto mb-4">
            <span className="dotting-dot" />
            <span className="dotting-dot" />
            <span className="dotting-dot" />
          </div>
          <p className="text-[var(--dotting-muted-gray)]">PDF를 준비하고 있어요</p>
        </div>
      </div>
    )
  }
)

type ViewMode = 'viewer' | 'editor' | 'pdf'

export default function CompilationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const sessionId = params.id as string
  const compilationId = searchParams.get('compilation')
  const initialMode = searchParams.get('mode') as ViewMode || 'viewer'
  
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode)
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 컴파일 상태 로드
  useEffect(() => {
    if (!compilationId) {
      router.push(`/dashboard/project/${sessionId}`)
      return
    }
    
    const loadCompilation = async () => {
      try {
        const res = await fetch(`/api/ai/book/compile/${compilationId}`)
        const data = await res.json()
        
        if (res.ok) {
          setReviewStatus(data.compilation.review_status)
          
          // 상태에 따라 기본 뷰 모드 결정
          if (data.compilation.review_status === 'approved_for_pdf') {
            setViewMode('pdf')
          } else if (data.compilation.review_status === 'approved_for_edit') {
            setViewMode('editor')
          } else {
            setViewMode('viewer')
          }
        }
      } catch (error) {
        console.error('Failed to load compilation:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadCompilation()
  }, [compilationId, sessionId, router])
  
  // 네비게이션 핸들러
  const handleNavigateToEditor = () => setViewMode('editor')
  const handleNavigateToPdf = () => setViewMode('pdf')
  const handleNavigateToInterview = () => router.push(`/dashboard/project/${sessionId}`)
  const handleNavigateToViewer = () => setViewMode('viewer')
  
  // PDF 인쇄 확정 후
  const handlePrintConfirm = () => {
    setReviewStatus('approved_for_print')
    setViewMode('viewer')
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="dotting-dots dotting-dots--loading dotting-dots--lg mx-auto mb-4">
            <span className="dotting-dot" />
            <span className="dotting-dot" />
            <span className="dotting-dot" />
          </div>
          <p className="text-[var(--dotting-muted-gray)]">준비하고 있어요</p>
        </div>
      </div>
    )
  }
  
  if (!compilationId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 mb-4">컴파일 ID가 필요합니다.</p>
        <button
          onClick={() => router.push(`/dashboard/project/${sessionId}`)}
          className="text-gray-900 underline"
        >
          돌아가기
        </button>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard/project/${sessionId}`)}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 프로젝트로
            </button>
            <span className="text-gray-300">|</span>
            <div className="flex gap-2">
              <button
                onClick={handleNavigateToViewer}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'viewer' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                검수
              </button>
              {reviewStatus && ['approved_for_edit', 'approved_for_pdf'].includes(reviewStatus) && (
                <button
                  onClick={handleNavigateToEditor}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'editor' 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  편집
                </button>
              )}
              {reviewStatus && ['approved_for_pdf', 'approved_for_print', 'printed'].includes(reviewStatus) && (
                <button
                  onClick={handleNavigateToPdf}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'pdf' 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {viewMode === 'viewer' && (
          <CompilationViewer
            compilationId={compilationId}
            sessionId={sessionId}
            onNavigateToEditor={handleNavigateToEditor}
            onNavigateToPdf={handleNavigateToPdf}
            onNavigateToInterview={handleNavigateToInterview}
          />
        )}
        
        {viewMode === 'editor' && (
          <CompilationEditor
            compilationId={compilationId}
            onBack={handleNavigateToViewer}
            onNavigateToPdf={handleNavigateToPdf}
          />
        )}
        
        {viewMode === 'pdf' && (
          <PdfPreview
            compilationId={compilationId}
            onBack={handleNavigateToViewer}
            onPrintConfirm={handlePrintConfirm}
          />
        )}
      </div>
    </div>
  )
}
