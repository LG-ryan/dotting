'use client'

/**
 * DOTTING CompilationEditor - 웹 에디터
 * 
 * 기능:
 * - 문단 텍스트 수정 (textarea)
 * - 문단 숨김/표시 토글
 * - 자동 저장 + "저장됨" 피드백
 * - approved_for_pdf → 수정 시 자동 되돌림 경고
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReviewStatus, ParagraphType } from '@/types/database'

interface ParagraphData {
  id: string
  order_index: number
  content: string
  paragraph_type: ParagraphType
  revision: number
  is_hidden: boolean
  isModified?: boolean
}

interface ChapterData {
  id: string
  order_index: number
  title: string | null
  paragraphs: ParagraphData[]
}

interface CompilationData {
  id: string
  version: number
  review_status: ReviewStatus
  result_meta: {
    book_meta?: {
      title: string
    }
  } | null
}

interface CompilationEditorProps {
  compilationId: string
  onNavigateToPdf?: () => void
  onBack?: () => void
}

// 상태별 설정
const canEdit = (status: ReviewStatus): boolean => {
  return ['pending_review', 'needs_fixes', 'approved_for_edit', 'approved_for_pdf'].includes(status)
}

export default function CompilationEditor({
  compilationId,
  onNavigateToPdf,
  onBack
}: CompilationEditorProps) {
  const [compilation, setCompilation] = useState<CompilationData | null>(null)
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, { content?: string; isHidden?: boolean }>>(new Map())
  
  // 경고 상태
  const [showSnapshotWarning, setShowSnapshotWarning] = useState(false)
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const response = await fetch(`/api/ai/book/compile/${compilationId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }
      
      setCompilation(data.compilation)
      
      // 문단에 is_hidden 추가
      const chaptersWithHidden = data.chapters?.map((ch: any) => ({
        ...ch,
        paragraphs: ch.paragraphs?.map((p: any) => ({
          ...p,
          is_hidden: p.is_hidden ?? false,
          isModified: false
        })) || []
      })) || []
      
      setChapters(chaptersWithHidden)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [compilationId])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // 변경 사항 저장
  const saveChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return
    
    setSaveStatus('saving')
    
    const changes = Array.from(pendingChanges.entries())
    let hasError = false
    let statusChanged = false
    
    for (const [paragraphId, change] of changes) {
      try {
        const response = await fetch(
          `/api/ai/book/compile/${compilationId}/paragraphs/${paragraphId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: change.content,
              isHidden: change.isHidden
            })
          }
        )
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error)
        }
        
        if (data.statusChanged) {
          statusChanged = true
          setCompilation(prev => prev ? {
            ...prev,
            review_status: data.newReviewStatus
          } : null)
        }
        
        // 성공 시 pendingChanges에서 제거
        setPendingChanges(prev => {
          const next = new Map(prev)
          next.delete(paragraphId)
          return next
        })
        
      } catch (err) {
        hasError = true
        console.error('Save error:', err)
      }
    }
    
    if (hasError) {
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setLastSavedAt(new Date())
      
      if (statusChanged) {
        setShowSnapshotWarning(true)
      }
    }
  }, [compilationId, pendingChanges])
  
  // 디바운스 저장
  const scheduleAutosave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveChanges()
    }, 1500)
  }, [saveChanges])
  
  // 문단 내용 변경
  const handleContentChange = (paragraphId: string, content: string) => {
    // 로컬 상태 업데이트
    setChapters(prev => prev.map(ch => ({
      ...ch,
      paragraphs: ch.paragraphs.map(p => 
        p.id === paragraphId ? { ...p, content, isModified: true } : p
      )
    })))
    
    // 변경 사항 추가
    setPendingChanges(prev => {
      const next = new Map(prev)
      const existing = next.get(paragraphId) || {}
      next.set(paragraphId, { ...existing, content })
      return next
    })
    
    setSaveStatus('idle')
    scheduleAutosave()
  }
  
  // 문단 숨김 토글
  const handleToggleHidden = (paragraphId: string, isHidden: boolean) => {
    // 로컬 상태 업데이트
    setChapters(prev => prev.map(ch => ({
      ...ch,
      paragraphs: ch.paragraphs.map(p =>
        p.id === paragraphId ? { ...p, is_hidden: isHidden } : p
      )
    })))
    
    // 변경 사항 추가
    setPendingChanges(prev => {
      const next = new Map(prev)
      const existing = next.get(paragraphId) || {}
      next.set(paragraphId, { ...existing, isHidden })
      return next
    })
    
    setSaveStatus('idle')
    scheduleAutosave()
  }
  
  // 즉시 저장
  const handleSaveNow = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveChanges()
  }
  
  // PDF 만들기
  const handleCreatePdf = async () => {
    // 먼저 저장
    if (pendingChanges.size > 0) {
      await saveChanges()
    }
    
    // review_status를 approved_for_pdf로 변경
    try {
      const response = await fetch(
        `/api/ai/book/compile/${compilationId}/review-status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toStatus: 'approved_for_pdf' })
        }
      )
      
      if (response.ok) {
        // pdf_snapshot_at 설정
        await fetch(`/api/ai/book/compile/${compilationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfSnapshotAt: new Date().toISOString() })
        }).catch(() => {}) // 실패해도 계속
        
        setCompilation(prev => prev ? {
          ...prev,
          review_status: 'approved_for_pdf'
        } : null)
        
        onNavigateToPdf?.()
      }
    } catch (err) {
      setError('PDF 준비에 실패했습니다.')
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
  
  const isEditable = canEdit(compilation.review_status)
  const isLocked = ['approved_for_print', 'printed', 'print_failed'].includes(compilation.review_status)
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* 상단 바 */}
      <div className="sticky top-0 z-10 bg-white border-b py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 돌아가기
            </button>
          )}
          <h1 className="text-lg font-medium">
            {compilation.result_meta?.book_meta?.title || '책 수정'}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 저장 상태 */}
          <div className="text-sm text-gray-500">
            {saveStatus === 'saving' && '저장 중...'}
            {saveStatus === 'saved' && lastSavedAt && (
              <span>저장됨 {lastSavedAt.toLocaleTimeString()}</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-500">저장 실패</span>
            )}
          </div>
          
          {/* 버튼 */}
          {isEditable && (
            <>
              <button
                onClick={handleSaveNow}
                disabled={saveStatus === 'saving' || pendingChanges.size === 0}
                className="px-4 py-2 border-2 border-[var(--dotting-deep-navy)] text-[var(--dotting-deep-navy)] rounded-lg hover:bg-[var(--dotting-deep-navy)]/10 disabled:border-[#B0B8C0] disabled:text-[#B0B8C0] transition-colors"
              >
                {saveStatus === 'saving' ? '저장 중...' : '저장'}
              </button>
              
              <button
                onClick={handleCreatePdf}
                disabled={saveStatus === 'saving' || pendingChanges.size > 0}
                className="px-4 py-2 bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] font-semibold rounded-lg hover:bg-[#C49660] disabled:bg-[#E8DFD3] disabled:text-[#A09080] transition-colors"
              >
                PDF 만들기
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* 잠금 경고 */}
      {isLocked && (
        <div className="mx-6 mt-4 p-4 bg-[var(--dotting-soft-cream)] rounded-lg border border-[var(--dotting-border)]">
          <p className="text-[var(--dotting-muted-text)]">
            인쇄가 확정되어 수정할 수 없어요.
            <br />
            문의가 필요하시면 <a href="mailto:support@dotting.com" className="underline text-[var(--dotting-warm-brown)]">고객센터</a>로 연락해주세요.
          </p>
        </div>
      )}
      
      {/* 스냅샷 경고 */}
      {showSnapshotWarning && (
        <div className="mx-6 mt-4 p-4 bg-yellow-50 rounded-lg flex items-center justify-between">
          <p className="text-yellow-700">
            PDF 확정이 취소됐어요. 수정 후 다시 [PDF 만들기]를 눌러주세요.
          </p>
          <button
            onClick={() => setShowSnapshotWarning(false)}
            className="text-yellow-700 hover:text-yellow-900"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* 에러 메시지 */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {/* 챕터/문단 편집 */}
      <div className="p-6 space-y-8">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="space-y-4">
            <h2 className="text-lg font-medium border-b pb-2">
              {chapter.title || `챕터 ${chapter.order_index / 1000}`}
            </h2>
            
            <div className="space-y-4">
              {chapter.paragraphs.map((para) => (
                <div
                  key={para.id}
                  className={`relative rounded-lg border ${
                    para.is_hidden 
                      ? 'bg-[var(--dotting-soft-cream)] border-[var(--dotting-border)] opacity-60' 
                      : para.isModified 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-white border-[var(--dotting-border)]'
                  }`}
                >
                  {/* 문단 헤더 */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--dotting-border)] bg-[var(--dotting-soft-cream)] rounded-t-lg">
                    <div className="flex items-center gap-2 text-sm text-[var(--dotting-muted-text)]">
                      {para.isModified && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          수정됨
                        </span>
                      )}
                      {para.is_hidden && (
                        <span className="px-2 py-0.5 bg-[var(--dotting-border)] text-[var(--dotting-muted-text)] rounded text-xs">
                          숨김
                        </span>
                      )}
                      {['editorial', 'intro', 'outro'].includes(para.paragraph_type) && (
                        <span className="text-xs text-[var(--dotting-muted-text)]">
                          {para.paragraph_type === 'intro' && '시작 문장'}
                          {para.paragraph_type === 'outro' && '마무리 문장'}
                          {para.paragraph_type === 'editorial' && '정리 문장'}
                        </span>
                      )}
                    </div>
                    
                    {isEditable && (
                      <button
                        onClick={() => handleToggleHidden(para.id, !para.is_hidden)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        {para.is_hidden ? '표시하기' : '숨기기'}
                      </button>
                    )}
                  </div>
                  
                  {/* 문단 내용 */}
                  {isEditable ? (
                    <textarea
                      value={para.content}
                      onChange={(e) => handleContentChange(para.id, e.target.value)}
                      disabled={!isEditable}
                      className={`w-full p-4 resize-none border-0 focus:ring-0 focus:outline-none rounded-b-lg ${
                        para.is_hidden ? 'text-gray-400 line-through' : 'text-gray-800'
                      }`}
                      style={{ 
                        minHeight: '100px',
                        whiteSpace: 'pre-wrap'
                      }}
                    />
                  ) : (
                    <p className={`p-4 ${para.is_hidden ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                       style={{ whiteSpace: 'pre-wrap' }}>
                      {para.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
