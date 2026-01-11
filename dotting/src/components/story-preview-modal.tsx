'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface Chapter {
  title: string
  content: string
}

interface StyleOptions {
  tone?: 'warm' | 'calm' | 'vivid'
  emphasis?: 'family' | 'scenery' | 'emotion'
}

interface StoryPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  chapter: Chapter | null
  loading: boolean
  remainingAttempts: number
  onRegenerate: (feedback: string, styleOptions: StyleOptions) => void
  onConfirm: (styleOptions: StyleOptions) => void
  isStale?: boolean  // 이야기가 추가되어 캐시가 오래된 경우
  onRefresh?: () => void  // 새로 정리하기
}

export function StoryPreviewModal({
  isOpen,
  onClose,
  chapter,
  loading,
  remainingAttempts,
  onRegenerate,
  onConfirm,
  isStale = false,
  onRefresh,
}: StoryPreviewModalProps) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [showStaleWarning, setShowStaleWarning] = useState(isStale)
  const [feedback, setFeedback] = useState('')
  const [selectedTone, setSelectedTone] = useState<StyleOptions['tone']>()
  const [selectedEmphasis, setSelectedEmphasis] = useState<StyleOptions['emphasis']>()

  // isStale prop이 변경될 때 showStaleWarning 업데이트
  useEffect(() => {
    setShowStaleWarning(isStale)
  }, [isStale])

  if (!isOpen) return null

  const handleRegenerate = () => {
    if (remainingAttempts <= 0) return
    onRegenerate(feedback, { tone: selectedTone, emphasis: selectedEmphasis })
    setFeedback('')
    setShowFeedback(false)
  }

  const handleConfirm = () => {
    onConfirm({ tone: selectedTone, emphasis: selectedEmphasis })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white relative">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-[var(--dotting-warm-gold)]/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">●●●</span>
              </div>
              <p className="text-[var(--dotting-deep-navy)]">이야기를 다듬고 있어요...</p>
              <p className="text-sm text-[var(--dotting-muted-text)] mt-2">잠시만 기다려주세요</p>
            </div>
          </div>
        ) : chapter ? (
          <div className="p-6">
            {/* Stale 경고 */}
            {showStaleWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm font-medium mb-2">
                  이야기가 추가되었어요
                </p>
                <p className="text-amber-700 text-sm mb-3">
                  새로운 대화 내용이 반영되지 않은 이전 버전이에요.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowStaleWarning(false)
                      onRefresh?.()
                    }}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    다시 정리하기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStaleWarning(false)}
                  >
                    이전 버전 유지
                  </Button>
                </div>
              </div>
            )}
            
            {/* 헤더 */}
            <div className="text-center mb-6">
              <p className="text-sm text-[var(--dotting-muted-text)] mb-1">미리보기</p>
              <h2 className="text-xl font-bold text-[var(--dotting-deep-navy)]">
                이런 느낌으로 정리해드릴게요
              </h2>
            </div>

            {/* 챕터 미리보기 */}
            <div className="bg-amber-50 rounded-lg p-6 mb-6">
              <div className="text-center mb-4">
                <span className="text-sm text-amber-700">Chapter 1</span>
                <h3 className="text-lg font-serif font-bold text-slate-800 mt-1">
                  {chapter.title}
                </h3>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
                {chapter.content}
              </p>
            </div>

            {/* 피드백 섹션 */}
            {showFeedback ? (
              <div className="space-y-4 mb-6">
                <div className="border-t border-[var(--dotting-border)] pt-4">
                  <h4 className="font-medium text-[var(--dotting-deep-navy)] mb-3">
                    이야기를 더 다듬어볼까요?
                  </h4>
                  <p className="text-sm text-[var(--dotting-muted-text)] mb-4">
                    원하시는 방향을 선택해주세요. 선택하신 내용을 반영해서 다시 써드릴게요.
                  </p>

                  {/* 문체와 분위기 */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-[var(--dotting-deep-navy)] mb-2">문체와 분위기</p>
                    <div className="space-y-2">
                      {[
                        { value: 'warm' as const, label: '좀 더 따뜻하고 포근하게' },
                        { value: 'calm' as const, label: '좀 더 담담하고 차분하게' },
                        { value: 'vivid' as const, label: '좀 더 생생하고 현장감 있게' },
                      ].map(option => (
                        <label key={option.value} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="tone"
                            value={option.value}
                            checked={selectedTone === option.value}
                            onChange={() => setSelectedTone(option.value)}
                            className="mr-2 accent-[var(--dotting-warm-gold)]"
                          />
                          <span className="text-sm text-[var(--dotting-deep-navy)]">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 강조하고 싶은 부분 */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-[var(--dotting-deep-navy)] mb-2">강조하고 싶은 부분</p>
                    <div className="space-y-2">
                      {[
                        { value: 'family' as const, label: '가족 간의 사랑이 더 느껴지게' },
                        { value: 'scenery' as const, label: '그 시절의 풍경이 더 그려지게' },
                        { value: 'emotion' as const, label: '감정의 깊이가 더 느껴지게' },
                      ].map(option => (
                        <label key={option.value} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="emphasis"
                            value={option.value}
                            checked={selectedEmphasis === option.value}
                            onChange={() => setSelectedEmphasis(option.value)}
                            className="mr-2 accent-[var(--dotting-warm-gold)]"
                          />
                          <span className="text-sm text-[var(--dotting-deep-navy)]">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 구체적인 수정 요청 */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-[var(--dotting-deep-navy)] mb-2">
                      구체적인 수정 요청 (선택)
                    </p>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="예: 우물 이야기를 더 자세히 담아주세요"
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-[var(--dotting-muted-text)]">
                      남은 기회: {remainingAttempts}회
                    </p>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowFeedback(false)}
                      >
                        취소
                      </Button>
                      <Button
                        onClick={handleRegenerate}
                        disabled={remainingAttempts <= 0}
                        variant="secondary"
                      >
                        다시 써주세요
                      </Button>
                    </div>
                  </div>

                  {remainingAttempts <= 0 && (
                    <p className="text-sm text-amber-600 mt-2">
                      수정 기회를 모두 사용하셨어요. 현재 버전으로 진행해주세요.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-center text-[var(--dotting-muted-text)] text-sm">
                  마음에 드시면 &apos;이대로 완성하기&apos;를 눌러주세요.
                  <br />
                  전체 이야기는 3개의 챕터로 구성됩니다.
                </p>
              </div>
            )}

            {/* 액션 버튼 */}
            {!showFeedback && (
              <div className="flex justify-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedback(true)}
                  disabled={remainingAttempts <= 0}
                  className="min-w-[120px]"
                >
                  다시 정리하기
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="min-w-[140px]"
                >
                  이대로 완성하기
                </Button>
              </div>
            )}

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[var(--dotting-muted-text)] hover:text-[var(--dotting-deep-navy)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[var(--dotting-muted-text)]">미리보기를 불러오는 중 오류가 발생했어요.</p>
            <Button onClick={onClose} className="mt-4">
              닫기
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
