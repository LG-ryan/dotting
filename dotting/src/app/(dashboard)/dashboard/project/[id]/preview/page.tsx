'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PaymentModal } from '@/components/payment/PaymentModal'
import type { OrderPaymentStatus } from '@/types/database'
import { PAID_ORDER_STATUSES } from '@/lib/free-tier-limits'

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
  const [showCover, setShowCover] = useState(true) // 표지 보기 상태
  
  // 결제 관련 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [orderStatus, setOrderStatus] = useState<OrderPaymentStatus | null>(null)
  const [isPaidSession, setIsPaidSession] = useState(false)

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

    // 주문 상태 로드
    const { data: orderData } = await supabase
      .from('orders')
      .select('status')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (orderData) {
      setOrderStatus(orderData.status as OrderPaymentStatus)
      setIsPaidSession(PAID_ORDER_STATUSES.includes(orderData.status as typeof PAID_ORDER_STATUSES[number]))
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
      setShowCover(false)
    }
  }

  // 로딩 상태 - ●○○ 애니메이션
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="dotting-dots dotting-dots--loading dotting-dots--lg mb-4">
          <span className="dotting-dot" />
          <span className="dotting-dot" />
          <span className="dotting-dot" />
        </div>
        <p className="text-[var(--dotting-muted-gray)]">책을 준비하고 있어요</p>
      </div>
    )
  }

  if (!draft || chapters.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="flex justify-center gap-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--dotting-border)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--dotting-border)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--dotting-border)]" />
        </div>
        <h1 className="text-xl font-bold text-[var(--dotting-deep-navy)] mb-3">
          아직 정리된 이야기가 없어요
        </h1>
        <p className="text-[var(--dotting-muted-gray)] mb-8">
          인터뷰를 더 진행하고 이야기를 정리해보세요
        </p>
        <Link href={`/dashboard/project/${sessionId}`}>
          <Button>인터뷰로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  const chapter = chapters[currentChapter]
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)]">
      {/* 상단 네비게이션 */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[var(--dotting-border)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link 
            href={`/dashboard/project/${sessionId}`}
            className="text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] transition-colors"
          >
            ← 인터뷰로 돌아가기
          </Link>
          <div className="flex items-center gap-2 text-sm text-[var(--dotting-muted-gray)]">
            <span>{chapters.length}개의 챕터</span>
            <span>·</span>
            <span>{showCover ? '표지' : `${currentChapter + 1} / ${chapters.length}`}</span>
          </div>
        </div>
      </div>

      {/* 책 프리뷰 영역 - Artifact Uprising 스타일 */}
      {/* pb-32: 하단 고정 CTA가 본문을 가리지 않도록 */}
      <div className="max-w-2xl mx-auto px-4 py-12 pb-32 md:pb-24">
        
        {/* 책 컨테이너 - 여백 속에 놓기 */}
        <div className="relative">
          {/* 미세한 종이 질감 오버레이 */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.02] rounded-sm"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* 책 그림자 */}
          <div className="absolute -inset-4 bg-gradient-to-b from-transparent via-black/[0.02] to-black/[0.05] rounded-lg -z-10" />
          
          {/* 책 본문 */}
          <div className="bg-white rounded-sm shadow-xl overflow-hidden">
            
            {showCover ? (
              /* ========== 표지 ========== */
              <div 
                className="aspect-[3/4] flex flex-col items-center justify-center p-8 sm:p-12 cursor-pointer relative"
                onClick={() => setShowCover(false)}
                style={{
                  background: 'linear-gradient(145deg, #1A365D 0%, #2D4A6F 100%)',
                }}
              >
                {/* 표지 내용 */}
                <div className="text-center px-4">
                  {/* 시그니처 */}
                  <p className="text-[10px] sm:text-xs tracking-[0.3em] text-[var(--dotting-warm-amber)] mb-6 sm:mb-8">
                    DOTTING
                  </p>
                  
                  {/* 제목 - Serif, 모바일 최적화 */}
                  <h1 className="dotting-serif text-2xl sm:text-3xl md:text-4xl text-white font-medium leading-tight mb-4">
                    {draft.title || `${session?.subject_name}의 이야기`}
                  </h1>
                  
                  {/* 구분선 */}
                  <div className="w-10 sm:w-12 h-px bg-[var(--dotting-warm-amber)]/50 mx-auto my-5 sm:my-6" />
                  
                  {/* 날짜 */}
                  <p className="text-xs sm:text-sm text-white/50">{currentYear}</p>
                </div>
                
                {/* 클릭 안내 - 모바일에서도 보이게 */}
                <p className="absolute bottom-6 sm:bottom-8 text-[10px] sm:text-xs text-white/40">
                  탭하여 내용 보기
                </p>
              </div>
            ) : (
              /* ========== 본문 페이지 ========== */
              <div className="min-h-[60vh] sm:min-h-[70vh]">
                {/* 페이지 상단 여백 */}
                <div className="h-8 sm:h-12 border-b border-gray-100" />
                
                {/* 본문 영역 - 책 폭/행간 적용, 모바일 최적화 */}
                <div className="px-5 sm:px-8 md:px-16 py-8 sm:py-12">
                  {/* 챕터 헤더 */}
                  <div className="text-center mb-8 sm:mb-12">
                    <p className="text-[10px] sm:text-xs tracking-[0.2em] text-[var(--dotting-warm-amber)] uppercase mb-2 sm:mb-3">
                      Chapter {currentChapter + 1}
                    </p>
                    <h2 className="dotting-serif text-xl sm:text-2xl md:text-3xl text-[var(--dotting-deep-navy)] font-medium">
                      {chapter.title}
                    </h2>
                  </div>
                  
                  {/* 본문 - Medium 스타일 가독성, 모바일 16px 보장 */}
                  <div 
                    className="text-[var(--dotting-deep-navy)] whitespace-pre-wrap text-base sm:text-[17px]"
                    style={{
                      lineHeight: '1.8',
                      letterSpacing: '-0.003em',
                    }}
                  >
                    {chapter.content}
                  </div>
                </div>
                
                {/* 페이지 번호 */}
                <div className="text-center py-4 sm:py-6 text-xs text-[var(--dotting-muted-gray)]">
                  {currentChapter + 1}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 페이지 네비게이션 */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => {
              if (showCover) return
              if (currentChapter === 0) {
                setShowCover(true)
              } else {
                goToChapter(currentChapter - 1)
              }
            }}
            disabled={showCover}
            className="text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] disabled:opacity-30 transition-colors"
          >
            ← 이전
          </button>
          
          {/* 챕터 인디케이터 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCover(true)}
              className={`w-2 h-2 rounded-full transition-colors ${
                showCover ? 'bg-[var(--dotting-warm-amber)]' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
            {chapters.map((_, index) => (
              <button
                key={index}
                onClick={() => goToChapter(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  !showCover && index === currentChapter 
                    ? 'bg-[var(--dotting-warm-amber)]' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => goToChapter(showCover ? 0 : currentChapter + 1)}
            disabled={!showCover && currentChapter === chapters.length - 1}
            className="text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] disabled:opacity-30 transition-colors"
          >
            다음 →
          </button>
        </div>

        {/* 목차 (접이식) */}
        <details className="mt-12 group">
          <summary className="cursor-pointer text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] list-none flex items-center gap-2">
            <span>목차 보기</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-4 space-y-1">
            {chapters.map((ch, index) => (
              <button
                key={ch.id}
                onClick={() => goToChapter(index)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                  !showCover && index === currentChapter
                    ? 'bg-[var(--dotting-soft-cream)] text-[var(--dotting-deep-navy)] font-medium'
                    : 'text-[var(--dotting-muted-gray)] hover:bg-gray-50'
                }`}
              >
                <span className="text-xs opacity-60 mr-2">{index + 1}.</span>
                {ch.title}
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* 하단 CTA 영역 - 고정, 모바일 최적화 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--dotting-border)] shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
          
          {!isPaidSession ? (
            /* ========== 미결제 상태 ========== */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* 체크리스트 - 모바일에서는 숨기거나 간소화 */}
              <div className="hidden sm:flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--dotting-muted-gray)]">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--dotting-ocean-teal)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  PDF
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--dotting-ocean-teal)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  실물 책
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--dotting-ocean-teal)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  무료 수정
                </span>
              </div>
              
              {/* 모바일: 버튼만 풀 와이드 */}
              <Button
                onClick={() => setShowPaymentModal(true)}
                size="lg"
                className="w-full sm:w-auto min-h-[48px]"
              >
                결제하고 완성하기
              </Button>
            </div>
          ) : (
            /* ========== 결제 완료 상태 ========== */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                {/* ●●● 완성 시그니처 */}
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--dotting-ocean-teal)]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--dotting-ocean-teal)]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--dotting-ocean-teal)]" />
                </div>
                <span className="text-sm text-[var(--dotting-deep-navy)] font-medium">
                  책이 완성됐어요
                </span>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button variant="secondary" className="flex-1 sm:flex-none min-h-[48px]">
                  PDF 다운로드
                </Button>
                <Button className="flex-1 sm:flex-none min-h-[48px]">
                  실물 책 주문
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 결제 모달 */}
      {session && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          sessionId={sessionId}
          subjectName={session.subject_name}
          onPaymentRequested={() => {
            setShowPaymentModal(false)
            loadPreview()
          }}
        />
      )}
    </div>
  )
}
