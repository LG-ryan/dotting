'use client'

/**
 * DOTTING CompilationViewer - 검수 콘솔
 * 
 * 상태별 단일 CTA 제공:
 * - pending_review → [수정하러 가기]
 * - needs_fixes → [수정하러 가기]
 * - approved_for_edit → [PDF 만들기]
 * - approved_for_pdf → [인쇄 확정]
 * - approved_for_print → 대기 화면
 * - printed → 완료 화면
 * - print_failed → 안내 + [문의하기]
 */

import { useState, useEffect, useCallback } from 'react'
import type { ReviewStatus, ParagraphType } from '@/types/database'

interface CompilationData {
  id: string
  version: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: {
    phase: string | null
    percent: number
    message: string | null
    updated_at: string | null
  }
  review_status: ReviewStatus
  result_meta: {
    book_meta?: {
      title: string
      intro: string
      outro: string
    }
    stats?: {
      chapter_count: number
      paragraph_count: number
    }
    warnings?: string[]
  } | null
  error_message: string | null
  error_detail: {
    code?: string
  } | null
}

interface ChapterData {
  id: string
  order_index: number
  title: string | null
  paragraphs: {
    id: string
    order_index: number
    content: string
    paragraph_type: ParagraphType
  }[]
}

interface CompilationViewerProps {
  compilationId: string
  sessionId: string
  onNavigateToEditor?: () => void
  onNavigateToPdf?: () => void
  onNavigateToInterview?: () => void
}

// 상태별 UI 설정
const REVIEW_STATUS_CONFIG: Record<ReviewStatus, {
  label: string
  description: string
  mainCta?: { label: string; action: 'edit' | 'pdf' | 'print' }
  subCta?: { label: string; action: 'review' | 'edit' | 'contact' }
}> = {
  'pending_review': {
    label: '검토 대기',
    description: '책이 완성되었어요. 내용을 확인하고 수정할 수 있어요.',
    mainCta: { label: '수정하러 가기', action: 'edit' }
  },
  'needs_fixes': {
    label: '수정 필요',
    description: '수정이 필요한 부분이 있어요.',
    mainCta: { label: '수정하러 가기', action: 'edit' }
  },
  'approved_for_edit': {
    label: '수정 중',
    description: '내용을 수정하고 있어요. 완료되면 PDF를 만들 수 있어요.',
    mainCta: { label: 'PDF 만들기', action: 'pdf' },
    subCta: { label: '다시 검토하기', action: 'review' }
  },
  'approved_for_pdf': {
    label: 'PDF 확인',
    description: 'PDF를 확인하고 인쇄를 확정해주세요.',
    mainCta: { label: 'PDF 보기', action: 'pdf_view' },
    subCta: { label: '다시 수정하기', action: 'edit' }
  },
  'approved_for_print': {
    label: '인쇄 준비 중',
    description: '인쇄를 준비하고 있어요. 잠시만 기다려주세요.'
  },
  'printed': {
    label: '완료',
    description: '책이 완성되었어요!'
  },
  'print_failed': {
    label: '인쇄 오류',
    description: '인쇄 중 문제가 발생했어요. 고객센터로 문의해주세요.',
    subCta: { label: '문의하기', action: 'contact' }
  }
}

// 문단 타입별 힌트 (soft 노출)
const PARAGRAPH_HINTS: Partial<Record<ParagraphType, string>> = {
  'editorial': '정리한 문장이에요',
  'intro': '시작 문장이에요',
  'outro': '마무리 문장이에요'
}

export default function CompilationViewer({
  compilationId,
  sessionId,
  onNavigateToEditor,
  onNavigateToPdf,
  onNavigateToInterview
}: CompilationViewerProps) {
  const [compilation, setCompilation] = useState<CompilationData | null>(null)
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const response = await fetch(`/api/ai/book/compile/${compilationId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }
      
      setCompilation(data.compilation)
      setChapters(data.chapters || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [compilationId])
  
  // 폴링 (processing 상태일 때만)
  useEffect(() => {
    loadData()
    
    const interval = setInterval(() => {
      if (compilation?.status === 'processing') {
        loadData()
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [loadData, compilation?.status])
  
  // review_status 변경
  const changeReviewStatus = async (toStatus: ReviewStatus) => {
    if (!compilation) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/ai/book/compile/${compilationId}/review-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '상태 변경에 실패했습니다.')
      }
      
      // 상태 갱신
      setCompilation(prev => prev ? { ...prev, review_status: toStatus } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }
  
  // CTA 핸들러
  const handleMainCta = (action: string) => {
    switch (action) {
      case 'edit':
        changeReviewStatus('approved_for_edit')
        onNavigateToEditor?.()
        break
      case 'pdf':
        // approved_for_edit → approved_for_pdf 전환 후 PDF 뷰어로 이동
        changeReviewStatus('approved_for_pdf')
        onNavigateToPdf?.()
        break
      case 'pdf_view':
        // approved_for_pdf 상태에서 PDF 뷰어로 이동 (상태 변경 없음)
        onNavigateToPdf?.()
        break
      case 'print':
        changeReviewStatus('approved_for_print')
        break
    }
  }
  
  const handleSubCta = (action: string) => {
    switch (action) {
      case 'review':
        changeReviewStatus('pending_review')
        break
      case 'edit':
        changeReviewStatus('approved_for_edit')
        onNavigateToEditor?.()
        break
      case 'contact':
        window.open('mailto:support@dotting.com', '_blank')
        break
    }
  }
  
  // 재시도 (시스템 오류 시)
  const handleRetry = async () => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/ai/book/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          intent: 'preview',
          idempotencyKey: `retry-${Date.now()}`
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        window.location.href = `/dashboard/project/${sessionId}?compilation=${data.compilation.id}`
      }
    } catch (err) {
      setError('다시 시도에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }
  
  // 로딩 화면
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  // 에러 화면
  if (error && !compilation) {
    return (
      <div className="p-6 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    )
  }
  
  if (!compilation) return null
  
  // Processing 화면
  if (compilation.status === 'processing') {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center">
        <div className="animate-spin w-12 h-12 border-3 border-gray-300 border-t-gray-800 rounded-full mx-auto mb-6" />
        <h3 className="text-xl font-medium mb-2">
          {compilation.progress.message || '책을 정리하고 있어요...'}
        </h3>
        <p className="text-gray-500 mb-4">
          중간에 나가도 저장됩니다.
        </p>
        <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gray-800 h-2 rounded-full transition-all duration-500"
            style={{ width: `${compilation.progress.percent}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {compilation.progress.percent}%
        </p>
      </div>
    )
  }
  
  // Failed 화면
  if (compilation.status === 'failed') {
    const errorCode = compilation.error_detail?.code
    const isSystemError = ['LLM_TIMEOUT', 'LLM_ERROR', 'DB_ERROR', 'INTERNAL_ERROR'].includes(errorCode || '')
    const isContentError = ['NO_EPISODES', 'NO_CORE_EPISODES'].includes(errorCode || '')
    
    return (
      <div className="p-8 bg-red-50 rounded-lg text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl">!</span>
        </div>
        <h3 className="text-xl font-medium text-red-800 mb-2">
          {isContentError ? '이야기가 더 필요해요' : '문제가 발생했어요'}
        </h3>
        <p className="text-red-600 mb-6">
          {compilation.error_message?.replace(/^\[.*?\]\s*/, '') || '알 수 없는 오류가 발생했습니다.'}
        </p>
        
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          {isSystemError && (
            <button
              onClick={handleRetry}
              disabled={actionLoading}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              {actionLoading ? '처리 중...' : '다시 시도'}
            </button>
          )}
          {isContentError && (
            <button
              onClick={onNavigateToInterview}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              이야기 더 나누기
            </button>
          )}
          <a
            href="mailto:support@dotting.com"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            문의하기
          </a>
        </div>
      </div>
    )
  }
  
  // Completed 화면
  const reviewConfig = REVIEW_STATUS_CONFIG[compilation.review_status]
  const bookMeta = compilation.result_meta?.book_meta
  const stats = compilation.result_meta?.stats
  
  return (
    <div className="space-y-6">
      {/* 상단 상태 바 */}
      <div className="p-4 bg-[var(--dotting-soft-cream)] rounded-lg flex items-center justify-between border border-[var(--dotting-border)]">
        <div>
          <span className="inline-block px-3 py-1 bg-[var(--dotting-warm-gold)]/20 text-[var(--dotting-deep-navy)] rounded-full text-sm font-medium">
            {reviewConfig.label}
          </span>
          <p className="text-[var(--dotting-muted-text)] mt-1">{reviewConfig.description}</p>
        </div>
        <div className="text-right text-sm text-[var(--dotting-muted-text)]">
          <p>버전 {compilation.version}</p>
          {stats && (
            <p>{stats.chapter_count}개 챕터 · {stats.paragraph_count}개 문단</p>
          )}
        </div>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {/* 책 제목 */}
      {bookMeta?.title && (
        <div className="text-center py-6">
          <h1 className="text-2xl font-serif">{bookMeta.title}</h1>
        </div>
      )}
      
      {/* 서문 */}
      {bookMeta?.intro && (
        <div className="p-6 bg-[var(--dotting-soft-cream)] rounded-lg italic text-[var(--dotting-deep-navy)] border border-[var(--dotting-border)]">
          {bookMeta.intro}
        </div>
      )}
      
      {/* 챕터 목록 */}
      <div className="space-y-8">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="border-l-2 border-[var(--dotting-warm-gold)] pl-6">
            <h2 className="text-lg font-medium mb-4 text-[var(--dotting-deep-navy)]">
              {chapter.title || `챕터 ${chapter.order_index / 1000}`}
            </h2>
            <div className="space-y-4">
              {chapter.paragraphs.map((para) => (
                <div key={para.id} className="relative group">
                  <p className={`text-[var(--dotting-deep-navy)] leading-relaxed ${
                    ['editorial', 'intro', 'outro'].includes(para.paragraph_type) 
                      ? 'bg-[var(--dotting-soft-cream)] p-3 rounded border border-[var(--dotting-border)]' 
                      : ''
                  }`}>
                    {para.content}
                  </p>
                  {/* Soft 힌트 (editorial/intro/outro만) */}
                  {PARAGRAPH_HINTS[para.paragraph_type] && (
                    <span className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[var(--dotting-muted-text)] bg-white px-2 py-1 rounded shadow">
                      {PARAGRAPH_HINTS[para.paragraph_type]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* 마무리 */}
      {bookMeta?.outro && (
        <div className="p-6 bg-[var(--dotting-soft-cream)] rounded-lg italic text-[var(--dotting-deep-navy)] border border-[var(--dotting-border)]">
          {bookMeta.outro}
        </div>
      )}
      
      {/* 경고 메시지 */}
      {compilation.result_meta?.warnings && compilation.result_meta.warnings.length > 0 && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700 font-medium mb-2">확인이 필요한 부분</p>
          <ul className="text-sm text-yellow-600 list-disc list-inside">
            {compilation.result_meta.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* CTA 버튼 */}
      <div className="flex flex-col items-center gap-3 pt-6 border-t border-[var(--dotting-border)]">
        {reviewConfig.mainCta && (
          <button
            onClick={() => handleMainCta(reviewConfig.mainCta!.action)}
            disabled={actionLoading}
            className="w-full max-w-sm px-6 py-4 bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] rounded-lg hover:bg-[#C49660] disabled:bg-[#E8DFD3] disabled:text-[#A09080] font-semibold transition-colors"
          >
            {actionLoading ? '처리 중...' : reviewConfig.mainCta.label}
          </button>
        )}
        {reviewConfig.subCta && (
          <button
            onClick={() => handleSubCta(reviewConfig.subCta!.action)}
            disabled={actionLoading}
            className="text-[var(--dotting-muted-text)] hover:text-[var(--dotting-deep-navy)] text-sm transition-colors"
          >
            {reviewConfig.subCta.label}
          </button>
        )}
      </div>
    </div>
  )
}
