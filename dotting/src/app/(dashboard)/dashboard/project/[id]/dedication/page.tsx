'use client'

/**
 * Final Seal (최종 봉인) 페이지
 * 
 * 인터뷰 완료 후 헌정사를 작성하는 전용 페이지
 * - 경로: /dashboard/project/[id]/dedication
 * - 시퀀스: 인터뷰 완료 → 헌정사 작성 → 99% 봉인 → 최종 생성
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface DedicationSuggestion {
  type: 'respect' | 'memory' | 'legacy'
  label: string
  text: string
  keywords: string[]
}

export default function DedicationPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [dedication, setDedication] = useState('')
  const [suggestions, setSuggestions] = useState<DedicationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  // 주문 및 제안 조회
  useEffect(() => {
    async function fetchData() {
      try {
        // 세션의 활성 주문 조회
        const sessionRes = await fetch(`/api/session/${sessionId}`)
        if (!sessionRes.ok) throw new Error('세션 조회 실패')
        
        const sessionData = await sessionRes.json()
        const activeOrder = sessionData.activeOrder

        if (!activeOrder) {
          alert('활성 주문이 없습니다')
          router.push(`/dashboard/project/${sessionId}`)
          return
        }

        setOrderId(activeOrder.id)

        // Heritage 패키지만 헌정사 제공
        if (activeOrder.package !== 'premium') {
          alert('Heritage 패키지만 헌정사를 작성할 수 있습니다')
          router.push(`/dashboard/project/${sessionId}`)
          return
        }

        // 이미 헌정사가 있는 경우
        if (activeOrder.dedication) {
          setDedication(activeOrder.dedication)
        }

        // 제안 조회
        const suggestionsRes = await fetch(`/api/orders/${activeOrder.id}/dedication-suggestions`)
        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json()
          if (suggestionsData.suggestions?.suggestions) {
            setSuggestions(suggestionsData.suggestions.suggestions)
          }
        }

      } catch (error) {
        console.error('데이터 조회 실패:', error)
        alert('데이터를 불러오는데 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sessionId, router])

  // 제안 선택
  const handleSelectSuggestion = (text: string) => {
    setDedication(text)
    setShowSuggestions(false)
  }

  // 나중에 하기
  const handleSkip = () => {
    router.push(`/dashboard/project/${sessionId}`)
  }

  // 최종 봉인하고 생성하기
  const handleSubmit = async () => {
    if (!orderId) return

    // 헌정사가 비어있으면 경고
    if (!dedication.trim()) {
      const confirm = window.confirm('헌정사를 작성하지 않으시겠어요?\n나중에 다시 작성할 수 있습니다.')
      if (!confirm) return
    }

    setSaving(true)

    try {
      // 헌정사 저장
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dedication: dedication.trim() || null })
      })

      if (!res.ok) throw new Error('헌정사 저장 실패')

      // 프로젝트 페이지로 이동 (아카이브 생성 트리거)
      router.push(`/dashboard/project/${sessionId}`)

    } catch (error) {
      console.error('헌정사 저장 실패:', error)
      alert('헌정사 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(to bottom, #FAFAF9, #F5F5F4)'
      }}
    >
      <div className="max-w-2xl w-full">
        {/* 헤드라인 */}
        <div className="text-center mb-12">
          <h1 
            className="text-3xl font-serif mb-4"
            style={{
              fontFamily: 'Noto Serif KR, serif',
              color: 'var(--dotting-deep-navy)',
              lineHeight: 1.6
            }}
          >
            이 모든 이야기를 관통하는<br />최종적인 진심
          </h1>
          <p 
            className="text-base text-gray-600"
            style={{
              fontFamily: 'Noto Serif KR, serif',
              lineHeight: 1.7
            }}
          >
            부모님의 생애를 담은 상자에<br />마지막 봉인을 더해주세요
          </p>
        </div>

        {/* 제안 버튼 */}
        {suggestions.length > 0 && !showSuggestions && (
          <div className="mb-6 text-center">
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => setShowSuggestions(true)}
              className="h-10"
            >
              이야기를 갈무리하는 문구 제안받기
            </Button>
          </div>
        )}

        {/* 제안 모달 */}
        {showSuggestions && (
          <div 
            className="mb-8 bg-white rounded-xl shadow-lg border p-6"
            style={{
              animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: 'Noto Serif KR, serif' }}
            >
              이야기를 갈무리하는 문구
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              도팅이 발견한 소중한 기록의 조각들을 바탕으로 제안합니다
            </p>

            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.type}
                  onClick={() => handleSelectSuggestion(suggestion.text)}
                  className="w-full text-left p-4 rounded-lg border hover:border-amber-500 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">{suggestion.label}</p>
                      <p 
                        className="text-base"
                        style={{ fontFamily: 'Noto Serif KR, serif' }}
                      >
                        {suggestion.text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        )}

        {/* 입력 필드 */}
        <div className="mb-8">
          <textarea
            value={dedication}
            onChange={(e) => {
              const text = e.target.value
              if (text.length <= 50) {
                setDedication(text)
              }
            }}
            placeholder="이 책과 함께 영원히 남을 소중한 한마디"
            className="w-full h-32 px-6 py-4 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
            style={{
              fontFamily: 'Noto Serif KR, serif',
              fontSize: '17px',
              lineHeight: 1.65
            }}
          />
          <div className="mt-2 text-right text-sm text-gray-500">
            {dedication.length}/50
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={handleSkip}
            disabled={saving}
            className="flex-1 h-10"
          >
            나중에 하기
          </Button>
          <Button
            type="button"
            size="xl"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 h-12"
          >
            {saving ? '저장 중...' : '최종 봉인하고 생성하기'}
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
