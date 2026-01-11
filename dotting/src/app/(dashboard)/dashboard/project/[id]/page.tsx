'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { StoryPreviewModal } from '@/components/story-preview-modal'
import { OrderStatusCard } from '@/components/payment/OrderStatusBadge'
import { PaymentModal } from '@/components/payment/PaymentModal'
import type { OrderPaymentStatus } from '@/types/database'

interface MessageMeta {
  question_source?: 'llm' | 'fallback'
  fallback_reason?: string
}

interface Message {
  id: string
  role: 'ai' | 'user'
  content: string
  input_type: 'text' | 'voice'
  order_index: number
  created_at: string
  meta?: MessageMeta
}

interface Session {
  id: string
  subject_name: string
  subject_relation: string
  mode: string
  status: string
}

interface PreviewChapter {
  title: string
  content: string
}

interface StyleOptions {
  tone?: 'warm' | 'calm' | 'vivid'
  emphasis?: 'family' | 'scenery' | 'emotion'
}

const MAX_PREVIEW_ATTEMPTS = 3

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // 수정 관련 상태
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [questionFailed, setQuestionFailed] = useState(false)
  const [retryingQuestion, setRetryingQuestion] = useState(false)
  const [consecutiveFallbacks, setConsecutiveFallbacks] = useState(0)  // 연속 fallback 횟수
  
  // 재생성 확인 모달 상태
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [pendingEditData, setPendingEditData] = useState<{
    messageIndex: number
    newContent: string
    originalMessages: Message[]
  } | null>(null)
  
  // 미리보기 관련 상태
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewChapter, setPreviewChapter] = useState<PreviewChapter | null>(null)
  const [previewAttempts, setPreviewAttempts] = useState(0)
  const [confirmedStyle, setConfirmedStyle] = useState<StyleOptions>({})
  const [hasExistingPreview, setHasExistingPreview] = useState(false)
  const [existingPreviewDraftId, setExistingPreviewDraftId] = useState<string | null>(null)
  const [previewIsStale, setPreviewIsStale] = useState(false)  // 캐시가 오래된 경우
  
  // 공유 링크 관련 상태
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  
  // 결제/주문 관련 상태
  const [orderStatus, setOrderStatus] = useState<OrderPaymentStatus | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 세션 및 메시지 로드
  useEffect(() => {
    loadSessionAndMessages()
  }, [sessionId])
  
  // 메시지 변경 시 stale 체크
  useEffect(() => {
    if (messages.length > 0) {
      checkExistingPreview(messages)
    }
  }, [messages.length])

  // 기존 미리보기 확인 + stale 감지
  const checkExistingPreview = async (currentMessages?: Message[]) => {
    try {
      const response = await fetch(`/api/ai/story/preview/get?sessionId=${sessionId}`)
      const data = await response.json()
      
      if (data.exists && data.preview) {
        setHasExistingPreview(true)
        setExistingPreviewDraftId(data.preview.draftId)
        setPreviewChapter(data.preview.chapter)
        setPreviewAttempts(data.preview.attempts || 0)
        
        // fingerprint 비교로 stale 감지
        const msgs = currentMessages || messages
        if (data.preview.fingerprint && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1]
          const isStale = 
            data.preview.fingerprint.messageId !== lastMsg.id ||
            data.preview.fingerprint.messageCount !== msgs.length
          setPreviewIsStale(isStale)
        }
      }
    } catch (error) {
      console.error('Failed to check existing preview:', error)
    }
  }

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessionAndMessages = async () => {
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

    // 활성 주문 정보 로드
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
    }

    // 메시지 로드
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })

    if (messagesData) {
      setMessages(messagesData)
    }

    // 메시지가 없으면 첫 질문 생성
    if (!messagesData || messagesData.length === 0) {
      await generateFirstQuestion(sessionData)
    }

    setLoading(false)
  }

  const generateFirstQuestion = async (sessionData: Session | null) => {
    if (!sessionData) return

    setGenerating(true)

    // 고정 인사 + 첫 질문 (LLM 없이도 항상 표시)
    const defaultGreeting = `안녕하세요, ${sessionData.subject_name}님! 오늘 함께 이야기 나눌 수 있어서 정말 기뻐요. 천천히 편하게 말씀해 주세요.

${sessionData.subject_name}님은 어린 시절 어디서 자라셨나요? 그때의 동네 풍경이나 분위기가 기억나시면 들려주세요.`

    try {
      const response = await fetch('/api/ai/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          subjectName: sessionData.subject_name,
          subjectRelation: sessionData.subject_relation,
          messages: [],
          isFirst: true,
        }),
      })

      const data = await response.json()
      
      // LLM 질문이 있으면 사용, 없으면 고정 인사 사용
      const questionContent = data.question || defaultGreeting
      const isFallback = !data.question || data.is_fallback

      // meta 정보 구성
      const meta: MessageMeta = {
        question_source: isFallback ? 'fallback' : 'llm',
      }
      if (isFallback) {
        meta.fallback_reason = data.error_message || '기본 인사 사용'
      }
      
      // DB에 AI 질문 저장 (meta 포함)
      const { data: newMessage } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          role: 'ai',
          content: questionContent,
          input_type: 'text',
          order_index: 0,
          meta,
        })
        .select()
        .single()

      if (newMessage) {
        setMessages([newMessage])
        
        if (isFallback) {
          setConsecutiveFallbacks(1)
        }
      }
    } catch (error) {
      console.error('Failed to generate first question:', error)
      
      // API 실패해도 고정 인사로 표시
      const meta: MessageMeta = {
        question_source: 'fallback',
        fallback_reason: 'API 호출 실패',
      }
      
      const { data: newMessage } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          role: 'ai',
          content: defaultGreeting,
          input_type: 'text',
          order_index: 0,
          meta,
        })
        .select()
        .single()

      if (newMessage) {
        setMessages([newMessage])
        setConsecutiveFallbacks(1)
      }
    }

    setGenerating(false)
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return

    setSending(true)
    setQuestionFailed(false)

    const userMessage = inputText.trim()
    setInputText('')

    // 사용자 메시지 저장
    const { data: savedUserMessage } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage,
        input_type: 'text',
        order_index: messages.length,
      })
      .select()
      .single()

    if (savedUserMessage) {
      setMessages(prev => [...prev, savedUserMessage])
    }

    // AI 후속 질문 생성
    await generateNextQuestion([...messages, { 
      id: savedUserMessage?.id || '', 
      role: 'user', 
      content: userMessage,
      input_type: 'text',
      order_index: messages.length,
      created_at: new Date().toISOString()
    }])

    setSending(false)
  }

  // AI 질문 생성 (재시도 가능)
  const generateNextQuestion = async (currentMessages: Message[]) => {
    setGenerating(true)
    setQuestionFailed(false)

    try {
      const response = await fetch('/api/ai/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          subjectName: session?.subject_name,
          subjectRelation: session?.subject_relation,
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          isFirst: false,
        }),
      })

      const data = await response.json()

      if (data.question) {
        // meta 정보 구성
        const meta: MessageMeta = {
          question_source: data.is_fallback ? 'fallback' : 'llm',
        }
        if (data.is_fallback && data.error_message) {
          meta.fallback_reason = data.error_message
        }
        
        // AI 질문 저장 (meta 포함)
        const { data: savedAiMessage } = await supabase
          .from('messages')
          .insert({
            session_id: sessionId,
            role: 'ai',
            content: data.question,
            input_type: 'text',
            order_index: currentMessages.length,
            meta,
          })
          .select()
          .single()

        if (savedAiMessage) {
          setMessages(prev => [...prev, savedAiMessage])
          
          if (data.is_fallback) {
            // fallback 질문: 메시지 아래에 버튼이 있으므로 questionFailed는 설정하지 않음
            setConsecutiveFallbacks(prev => prev + 1)
          } else {
            // 정상 질문이면 연속 fallback 초기화
            setQuestionFailed(false)
            setConsecutiveFallbacks(0)
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate question:', error)
      setQuestionFailed(true)
      setConsecutiveFallbacks(prev => prev + 1)
    }

    setGenerating(false)
  }

  // 질문 재생성 (재시도)
  const handleRetryQuestion = async () => {
    if (retryingQuestion) return
    
    setRetryingQuestion(true)
    
    // 마지막 AI 메시지가 fallback이면 삭제하고 재생성
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'ai') {
      // DB에서 삭제
      await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', lastMessage.id)
      
      // 상태에서 제거
      const updatedMessages = messages.slice(0, -1)
      setMessages(updatedMessages)
      
      // 재생성
      await generateNextQuestion(updatedMessages)
    }
    
    setRetryingQuestion(false)
  }

  // 마지막 답변 수정 시작
  const handleStartEdit = (message: Message) => {
    // 질문 생성 중에는 수정 불가 (레이스 방지)
    if (generating) {
      return
    }
    
    // 마지막 사용자 메시지만 수정 가능
    const userMessages = messages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]
    
    if (message.id !== lastUserMessage?.id) {
      return
    }
    
    setEditingMessageId(message.id)
    setEditText(message.content)
  }

  // 수정 저장
  const handleSaveEdit = async () => {
    // 질문 생성 중에는 저장 불가 (레이스 방지)
    if (!editingMessageId || !editText.trim() || generating) return
    
    const newContent = editText.trim()
    const originalMessage = messages.find(m => m.id === editingMessageId)
    
    if (!originalMessage || originalMessage.content === newContent) {
      setEditingMessageId(null)
      setEditText('')
      return
    }
    
    // 감사 로그 기록 (before/after)
    await supabase
      .from('message_edit_logs')
      .insert({
        message_id: editingMessageId,
        session_id: sessionId,
        before_content: originalMessage.content,
        after_content: newContent,
        edit_type: 'edit',
      })
    
    // DB 업데이트
    await supabase
      .from('messages')
      .update({ content: newContent })
      .eq('id', editingMessageId)
    
    // 상태 업데이트
    setMessages(prev => prev.map(m => 
      m.id === editingMessageId ? { ...m, content: newContent } : m
    ))
    
    setEditingMessageId(null)
    setEditText('')
    
    // 이후 AI 질문이 있으면 재생성 선택 모달 표시
    const messageIndex = messages.findIndex(m => m.id === editingMessageId)
    const hasFollowingAiMessage = messages.slice(messageIndex + 1).some(m => m.role === 'ai')
    
    if (hasFollowingAiMessage) {
      setPendingEditData({
        messageIndex,
        newContent,
        originalMessages: [...messages],
      })
      setShowRegenerateConfirm(true)
    }
  }
  
  // 재생성 확인 - [다시 만들기]
  const handleConfirmRegenerate = async () => {
    if (!pendingEditData) return
    
    const { messageIndex, newContent, originalMessages } = pendingEditData
    
    // 이후 AI 메시지 삭제하고 재생성
    const messagesUntilEdit = originalMessages.slice(0, messageIndex + 1)
    messagesUntilEdit[messagesUntilEdit.length - 1] = { 
      ...messagesUntilEdit[messagesUntilEdit.length - 1], 
      content: newContent 
    }
    
    // 이후 메시지들 soft delete + 감사 로그
    const messagesToDelete = originalMessages.slice(messageIndex + 1)
    for (const m of messagesToDelete) {
      // 감사 로그
      await supabase
        .from('message_edit_logs')
        .insert({
          message_id: m.id,
          session_id: sessionId,
          before_content: m.content,
          after_content: '',
          edit_type: 'delete',
        })
      
      // soft delete
      await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', m.id)
    }
    
    setMessages(messagesUntilEdit)
    setShowRegenerateConfirm(false)
    setPendingEditData(null)
    await generateNextQuestion(messagesUntilEdit)
  }
  
  // 재생성 확인 - [그대로 두기]
  const handleKeepExisting = () => {
    setShowRegenerateConfirm(false)
    setPendingEditData(null)
  }

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 미리보기 시작 (기존 것 있으면 바로 표시)
  const handleStartPreview = async () => {
    if (!session) return
    
    setShowPreviewModal(true)

    // 기존 미리보기가 있으면 바로 표시
    if (hasExistingPreview && previewChapter) {
      // stale이면 재생성 여부 확인
      if (previewIsStale) {
        // 모달에서 stale 상태 표시 (재생성 선택 버튼 제공)
        // StoryPreviewModal에서 처리
      }
      return // 이미 previewChapter가 설정되어 있음
    }
    
    // 기존 미리보기가 없을 때만 새로 생성
    await generatePreview()
  }

  // 미리보기 생성 (신규 또는 재생성)
  const generatePreview = async (feedback?: string, styleOptions?: object) => {
    if (!session) return
    
    setPreviewLoading(true)

    try {
      const response = await fetch('/api/ai/story/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          subjectName: session.subject_name,
          subjectRelation: session.subject_relation,
          messages: messages.map(m => ({ 
            role: m.role, 
            content: m.content,
            order_index: m.order_index,
            id: m.id
          })),
          feedback,
          styleOptions,
        }),
      })

      const data = await response.json()

      if (data.success && data.chapter) {
        setPreviewChapter(data.chapter)
        setHasExistingPreview(true)
        setExistingPreviewDraftId(data.draftId)
        
        // DB에서 시도 횟수 업데이트
        if (data.attempts !== undefined) {
          setPreviewAttempts(data.attempts)
        } else {
          setPreviewAttempts(prev => prev + 1)
        }
      } else {
        alert(data.error || '미리보기 생성에 실패했습니다')
        if (!hasExistingPreview) {
          setShowPreviewModal(false)
        }
      }
    } catch (error) {
      console.error('Failed to generate preview:', error)
      alert('미리보기 생성에 실패했습니다')
      if (!hasExistingPreview) {
        setShowPreviewModal(false)
      }
    }

    setPreviewLoading(false)
  }

  // 미리보기 재생성 (피드백 반영)
  const handleRegeneratePreview = async (feedback: string, styleOptions: StyleOptions) => {
    if (!session || previewAttempts >= MAX_PREVIEW_ATTEMPTS) return
    
    setConfirmedStyle(styleOptions)
    await generatePreview(feedback, styleOptions)
  }

  // 전체 스토리 생성 확정
  const handleConfirmStory = async (styleOptions: StyleOptions) => {
    if (!session) return
    
    setPreviewLoading(true)
    setConfirmedStyle(styleOptions)

    try {
      const response = await fetch('/api/ai/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          subjectName: session.subject_name,
          subjectRelation: session.subject_relation,
          messages: messages.map(m => ({ 
            role: m.role, 
            content: m.content,
            order_index: m.order_index,
            id: m.id
          })),
          confirmedStyle: styleOptions,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowPreviewModal(false)
        router.push(`/dashboard/project/${sessionId}/preview`)
      } else {
        alert(data.error || '이야기 완성에 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to generate story:', error)
      alert('이야기 완성에 실패했습니다')
    }

    setPreviewLoading(false)
  }

  // 공유 링크 생성
  const handleCreateShareLink = async () => {
    setShareLoading(true)
    
    try {
      const response = await fetch('/api/session/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (data.shareUrl) {
        setShareUrl(data.shareUrl)
        setShowShareModal(true)
      } else {
        alert(data.error || '공유 링크 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to create share link:', error)
      alert('공유 링크 생성에 실패했습니다.')
    }

    setShareLoading(false)
  }

  // 링크 복사
  const handleCopyShareLink = async () => {
    if (!shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">로딩 중...</div>
      </div>
    )
  }

  const userAnswerCount = messages.filter(m => m.role === 'user').length
  const canGenerateStory = userAnswerCount >= 5

  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        {/* 뒤로가기 버튼 - 부드러운 텍스트 링크 스타일 */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-4 text-sm text-[#6B7280] hover:text-[#1E3A5F] transition-colors"
        >
          ← 프로젝트 목록으로
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {session?.subject_name}님의 이야기
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              {session?.subject_relation} · {userAnswerCount}개의 답변
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateShareLink}
            disabled={shareLoading}
            className="text-amber-700 border-amber-200 hover:bg-amber-50"
          >
            {shareLoading ? '생성 중...' : '링크 공유'}
          </Button>
        </div>
      </div>
      
      {/* 결제/주문 상태 카드 */}
      {orderStatus && ['pending_payment', 'paid', 'in_production', 'ready_to_ship', 'shipped', 'delivered'].includes(orderStatus) && (
        <div className="mb-6">
          <OrderStatusCard status={orderStatus} />
          {orderStatus === 'pending_payment' && (
            <Button
              onClick={() => setShowPaymentModal(true)}
              className="mt-3 w-full bg-[var(--dotting-deep-navy)] hover:bg-[#2A4A6F]"
            >
              결제 안내 보기
            </Button>
          )}
        </div>
      )}
      
      {/* 결제 안내 모달 */}
      {session && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          sessionId={sessionId}
          subjectName={session.subject_name}
          onPaymentRequested={() => {
            setShowPaymentModal(false)
            loadSessionAndMessages() // 주문 상태 새로고침
          }}
        />
      )}

      {/* 채팅 영역 */}
      <Card className="h-[500px] flex flex-col">
        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 질문 생성 중 표시 */}
          {generating && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[var(--dotting-warm-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[var(--dotting-muted-text)]">첫 질문을 준비하고 있어요...</p>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => {
            const isLastUserMessage = message.role === 'user' && 
              message.id === messages.filter(m => m.role === 'user').slice(-1)[0]?.id
            const isLastAiMessage = message.role === 'ai' && index === messages.length - 1
            const isEditing = editingMessageId === message.id
            
            return (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {isEditing ? (
                    // 수정 모드
                    <div className="w-full">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[60px] mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          className="text-xs text-[var(--dotting-muted-text)] hover:text-[var(--dotting-deep-navy)]"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="text-xs bg-[var(--dotting-deep-navy)] text-white px-3 py-1 rounded hover:bg-[#2A4A6F]"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 일반 표시 모드
                    <>
                      <div
                        className={`p-4 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] rounded-br-md font-medium'
                            : message.meta?.question_source === 'fallback'
                            ? 'bg-[var(--dotting-soft-cream)] text-[var(--dotting-deep-navy)] rounded-bl-md border border-amber-200'
                            : 'bg-[var(--dotting-soft-cream)] text-[var(--dotting-deep-navy)] rounded-bl-md border border-[var(--dotting-border)]'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      {/* 마지막 AI 질문 아래: 답변 가이드 힌트 */}
                      {isLastAiMessage && !generating && (
                        <div className="mt-3 p-3 bg-[#FEFCF8] rounded-lg border border-[#F0EBE0] max-w-full">
                          <p className="text-xs text-[#8B7355] font-medium mb-1.5">💡 이런 내용을 떠올려보세요</p>
                          <div className="text-xs text-[#A89880] space-y-1">
                            <p>• <span className="text-[#8B7355]">장소와 풍경</span> — 그때 어디에 있었나요?</p>
                            <p>• <span className="text-[#8B7355]">함께한 사람</span> — 누구와 함께였나요?</p>
                            <p>• <span className="text-[#8B7355]">감정과 느낌</span> — 어떤 기분이었나요?</p>
                            <p>• <span className="text-[#8B7355]">오감의 기억</span> — 소리, 냄새, 맛이 기억나시나요?</p>
                          </div>
                        </div>
                      )}
                      
                      {/* 마지막 사용자 메시지: 수정 버튼 */}
                      {isLastUserMessage && !generating && (
                        <button
                          onClick={() => handleStartEdit(message)}
                          className="text-xs text-[var(--dotting-muted-text)] hover:text-[var(--dotting-deep-navy)] mt-1"
                        >
                          수정
                        </button>
                      )}
                      
                      {/* 마지막 AI 메시지가 fallback이면: 다른 질문 받기 버튼 */}
                      {isLastAiMessage && message.meta?.question_source === 'fallback' && !generating && (
                        <button
                          onClick={handleRetryQuestion}
                          disabled={retryingQuestion || consecutiveFallbacks >= 3}
                          className="text-xs text-amber-600 hover:text-amber-800 mt-2 flex items-center gap-1"
                        >
                          {consecutiveFallbacks >= 3 ? (
                            <span className="text-amber-500">잠시 후 다시 시도해주세요</span>
                          ) : retryingQuestion ? (
                            <span>다시 만드는 중...</span>
                          ) : (
                            <>
                              <span>↻</span>
                              <span>다른 질문 받기</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {generating && (
            <div className="flex justify-start">
              <div className="bg-[var(--dotting-soft-cream)] text-[var(--dotting-deep-navy)] p-4 rounded-2xl rounded-bl-md border border-[var(--dotting-border)]">
                <p className="text-sm">질문을 생각하고 있어요 ●●●</p>
              </div>
            </div>
          )}

          {/* 질문 생성 실패 시 재시도 버튼 */}
          {questionFailed && !generating && (
            <div className="flex flex-col items-center gap-2">
              {consecutiveFallbacks >= 3 ? (
                // 연속 3회 이상 실패 시 톤 관리
                <p className="text-sm text-amber-600">
                  잠시 후 다시 시도해주세요
                </p>
              ) : (
                <button
                  onClick={handleRetryQuestion}
                  disabled={retryingQuestion}
                  className="text-sm text-[var(--dotting-warm-brown)] hover:text-[var(--dotting-deep-navy)] flex items-center gap-1"
                >
                  <span>↻</span>
                  {retryingQuestion ? '다시 만드는 중...' : '다른 질문 받기'}
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="border-t border-[var(--dotting-border)] p-4">
          <div className="flex space-x-3">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="답변을 입력하세요..."
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              disabled={sending || generating}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || sending || generating}
              className="h-[60px] px-6"
            >
              전송
            </Button>
          </div>
          <p className="text-xs text-[var(--dotting-muted-text)] mt-2">
            Enter로 전송, Shift+Enter로 줄바꿈
          </p>
        </div>
      </Card>

      {/* 하단 액션 */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-sm text-[var(--dotting-muted-text)]">
          {!canGenerateStory 
            ? `답변이 ${5 - userAnswerCount}개 더 필요해요`
            : hasExistingPreview && previewIsStale
            ? '새로운 이야기가 추가되었어요'
            : hasExistingPreview
            ? '이전에 다듬던 이야기가 있어요'
            : '이야기를 정리할 준비가 되었어요'}
        </p>
        <Button
          disabled={!canGenerateStory}
          onClick={handleStartPreview}
        >
          {hasExistingPreview ? '이야기 이어서 보기' : '이야기 정리하기'}
        </Button>
      </div>

      {/* 미리보기 모달 */}
      <StoryPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        chapter={previewChapter}
        loading={previewLoading}
        remainingAttempts={MAX_PREVIEW_ATTEMPTS - previewAttempts}
        onRegenerate={handleRegeneratePreview}
        onConfirm={handleConfirmStory}
        isStale={previewIsStale}
        onRefresh={() => generatePreview()}
      />
      
      {/* 재생성 확인 모달 */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 bg-white">
            <h3 className="text-lg font-semibold text-[var(--dotting-deep-navy)] mb-2">
              답변이 수정되었어요
            </h3>
            <p className="text-[var(--dotting-muted-text)] text-sm mb-6">
              다음 질문을 다시 만들까요? 
              <br />
              <span className="text-[var(--dotting-muted-text)]/70">그대로 두면 이전 질문이 유지됩니다.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleKeepExisting}
              >
                그대로 두기
              </Button>
              <Button
                variant="secondary"
                onClick={handleConfirmRegenerate}
              >
                다시 만들기
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* 공유 링크 모달 */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 bg-white">
            <h3 className="text-lg font-semibold text-[var(--dotting-deep-navy)] mb-2">
              공유 링크가 생성되었어요
            </h3>
            <p className="text-[var(--dotting-muted-text)] text-sm mb-4">
              이 링크를 {session?.subject_name}님께 보내드리세요.
              <br />
              <span className="text-[var(--dotting-warm-brown)]">로그인 없이 바로 답변하실 수 있어요.</span>
            </p>
            
            <div className="bg-[var(--dotting-soft-cream)] rounded-lg p-3 mb-4 border border-[var(--dotting-border)]">
              <p className="text-sm text-[var(--dotting-deep-navy)] break-all font-mono">
                {shareUrl}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowShareModal(false)}
              >
                닫기
              </Button>
              <Button
                className="flex-1"
                onClick={handleCopyShareLink}
              >
                {shareCopied ? '복사됨!' : '링크 복사'}
              </Button>
            </div>
            
            <p className="text-xs text-[var(--dotting-muted-text)] text-center mt-4">
              링크는 30일간 유효합니다
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
