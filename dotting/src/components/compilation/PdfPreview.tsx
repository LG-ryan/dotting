'use client'

/**
 * DOTTING PDF Preview - 인라인 미리보기
 * 
 * - @react-pdf/renderer로 클라이언트 렌더링
 * - 스냅샷 기반 데이터만 사용
 * - 확인 체크 + 인쇄 확정 UI
 */

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { ReviewStatus, ParagraphType } from '@/types/database'

// react-pdf는 클라이언트에서만 로드
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFViewer),
  { ssr: false, loading: () => <div className="p-8 text-center">PDF 뷰어 로딩 중...</div> }
)

const PdfDocument = dynamic(
  () => import('./PdfDocument'),
  { ssr: false }
)

interface PdfParagraph {
  id: string
  content: string
  paragraph_type: ParagraphType
}

interface PdfChapter {
  order_index: number
  title: string | null
  paragraphs: PdfParagraph[]
}

interface PdfData {
  compilation_id: string
  snapshot_version: number
  meta: {
    title: string
    intro: string | null
    outro: string | null
  }
  chapters: PdfChapter[]
  stats: {
    chapter_count: number
    paragraph_count: number
  }
}

interface CompilationData {
  id: string
  review_status: ReviewStatus
  pdf_confirmed_at: string | null
}

interface PdfPreviewProps {
  compilationId: string
  onBack?: () => void
  onPrintConfirm?: () => void
}

export default function PdfPreview({
  compilationId,
  onBack,
  onPrintConfirm
}: PdfPreviewProps) {
  const [pdfData, setPdfData] = useState<PdfData | null>(null)
  const [compilation, setCompilation] = useState<CompilationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 확인 상태
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  
  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      // PDF 데이터 조회
      const pdfRes = await fetch(`/api/ai/book/compile/${compilationId}/pdf`)
      const pdfJson = await pdfRes.json()
      
      if (!pdfRes.ok) {
        throw new Error(pdfJson.error || 'PDF 데이터를 불러올 수 없습니다.')
      }
      
      setPdfData(pdfJson.pdf)
      
      // 컴파일 상태 조회
      const compRes = await fetch(`/api/ai/book/compile/${compilationId}`)
      const compJson = await compRes.json()
      
      if (compRes.ok) {
        setCompilation(compJson.compilation)
        setIsConfirmed(!!compJson.compilation.pdf_confirmed_at)
      }
      
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
  
  // 확인 체크
  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      const res = await fetch(`/api/ai/book/compile/${compilationId}/pdf/confirm`, {
        method: 'POST'
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || '확인 처리에 실패했습니다.')
      }
      
      setIsConfirmed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setConfirmLoading(false)
    }
  }
  
  // 인쇄 확정
  const handlePrintConfirm = async () => {
    if (!isConfirmed) {
      setError('먼저 내용을 확인해주세요.')
      return
    }
    
    setPrintLoading(true)
    try {
      const res = await fetch(`/api/ai/book/compile/${compilationId}/review-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: 'approved_for_print' })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || '인쇄 확정에 실패했습니다.')
      }
      
      onPrintConfirm?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setPrintLoading(false)
    }
  }
  
  // 로딩 화면
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">PDF를 준비하고 있어요...</p>
        </div>
      </div>
    )
  }
  
  // 에러 화면
  if (error && !pdfData) {
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
  
  if (!pdfData) return null
  
  return (
    <div className="flex flex-col h-full">
      {/* 상단 바 */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 돌아가기
            </button>
          )}
          <h1 className="text-lg font-medium">{pdfData.meta.title}</h1>
          <span className="text-sm text-gray-500">
            v{pdfData.snapshot_version} · {pdfData.stats.chapter_count}개 챕터
          </span>
        </div>
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {/* PDF 뷰어 */}
      <div className="flex-1 bg-gray-100">
        <PDFViewer
          style={{ width: '100%', height: '100%', border: 'none' }}
          showToolbar={true}
        >
          <PdfDocument data={pdfData} />
        </PDFViewer>
      </div>
      
      {/* 하단 확인 영역 */}
      <div className="p-4 border-t bg-white">
        <div className="max-w-2xl mx-auto">
          {/* 확인 체크박스 */}
          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={() => !isConfirmed && handleConfirm()}
              disabled={isConfirmed || confirmLoading}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
            <span className={`text-sm ${isConfirmed ? 'text-gray-500' : 'text-gray-700'}`}>
              내용을 확인했으며, 이대로 인쇄를 진행합니다.
              {isConfirmed && (
                <span className="ml-2 text-green-600">확인됨</span>
              )}
            </span>
          </label>
          
          {/* 인쇄 확정 버튼 */}
          <button
            onClick={handlePrintConfirm}
            disabled={!isConfirmed || printLoading}
            className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {printLoading ? '처리 중...' : '인쇄 확정'}
          </button>
          
          <p className="mt-2 text-xs text-gray-400 text-center">
            인쇄 확정 후에는 수정할 수 없습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
