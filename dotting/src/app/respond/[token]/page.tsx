'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface Message {
  id: string
  role: 'ai' | 'user'
  content: string
  order_index: number
  created_at: string
}

interface SessionInfo {
  id: string
  subject_name: string
  subject_relation: string
  mode: string
  status: string
}

export default function RespondPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 수정 관련 상태
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  
  // 큰 글씨 모드
  const [largeMode, setLargeMode] = useState(false)
  
  // 이전 대화 펼침 상태
  const [showAllHistory, setShowAllHistory] = useState(false)
  
  // 짧은 답변 확인 모달
  const [showShortAnswerPrompt, setShowShortAnswerPrompt] = useState(false)
  const [pendingMessage, setPendingMessage] = useState('')
  const [shortAnswerDismissed, setShortAnswerDismissed] = useState(false) // 이미 거절한 경우 재팝업 방지
  
  // 전송 실패 시 내용 복구
  const [failedMessage, setFailedMessage] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'network' | 'server' | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 큰 글씨 모드 초기화 (localStorage + URL 파라미터)
  useEffect(() => {
    // URL 파라미터 우선
    const uiParam = searchParams.get('ui')
    if (uiParam === 'large') {
      setLargeMode(true)
      localStorage.setItem('dotting_large_mode', 'true')
      return
    }
    
    // localStorage 확인
    const saved = localStorage.getItem('dotting_large_mode')
    if (saved === 'true') {
      setLargeMode(true)
    }
  }, [searchParams])

  // 큰 글씨 모드 토글
  const toggleLargeMode = () => {
    const newMode = !largeMode
    setLargeMode(newMode)
    localStorage.setItem('dotting_large_mode', newMode ? 'true' : 'false')
  }

  // 세션 및 메시지 로드
  useEffect(() => {
    loadSessionByToken()
  }, [token])

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessionByToken = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('get_session_by_share_token', { p_token: token })
      
      if (sessionError || !sessionData || sessionData.length === 0) {
        setError('유효하지 않거나 만료된 링크입니다.')
        setLoading(false)
        return
      }
      
      const session = sessionData[0]
      setSessionInfo(session)

      const { data: messagesData, error: messagesError } = await supabase
        .rpc('get_messages_by_token', { p_token: token })
      
      if (messagesError) {
        console.error('Failed to load messages:', messagesError)
      }

      if (messagesData) {
        setMessages(messagesData)
      }

      if (!messagesData || messagesData.length === 0) {
        await generateFirstQuestion(session)
      }
    } catch (err) {
      console.error('Failed to load session:', err)
      setError('세션을 불러오는데 실패했습니다.')
    }

    setLoading(false)
  }

  const generateFirstQuestion = async (session: SessionInfo) => {
    setGenerating(true)

    try {
      const response = await fetch('/api/respond/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          subjectName: session.subject_name,
          subjectRelation: session.subject_relation,
          messages: [],
          isFirst: true,
        }),
      })

      const data = await response.json()

      if (data.question) {
        await reloadMessages()
      }
    } catch (error) {
      console.error('Failed to generate first question:', error)
    }

    setGenerating(false)
  }

  const reloadMessages = async () => {
    const { data: messagesData } = await supabase
      .rpc('get_messages_by_token', { p_token: token })
    
    if (messagesData) {
      setMessages(messagesData)
    }
  }

  // 짧은 답변 체크
  const MIN_HARD_LENGTH = 4      // 1~3자는 강하게 유도
  const MIN_SOFT_LENGTH = 30     // 4~29자는 패턴 체크 후 유도
  
  // 숫자/날짜/고유명사 패턴 (예외 허용)
  const hasValidPattern = (text: string): boolean => {
    // 연도 (1900~2099)
    if (/\b(19|20)\d{2}\b/.test(text)) return true
    // 날짜 패턴 (월, 일)
    if (/\b\d{1,2}월|\b\d{1,2}일/.test(text)) return true
    // 나이
    if (/\b\d{1,3}살|\b\d{1,3}세/.test(text)) return true
    // 숫자가 포함된 의미있는 답변 (예: "3명", "5년")
    if (/\d+[명년개번]/.test(text)) return true
    // 짧지만 완결된 답변 (예: "네", "아니요", "모르겠어요")
    if (/^(네|예|아니요|아니오|몰라요|모르겠어요|기억이 안 나요|없어요|있어요)/.test(text)) return true
    return false
  }
  
  const handleTrySend = () => {
    if (!inputText.trim() || sending || generating) return
    
    const trimmed = inputText.trim()
    
    // 1~3자: 강하게 유도 (패턴 예외 없음, 단 이미 거절한 경우 제외)
    if (trimmed.length < MIN_HARD_LENGTH && !shortAnswerDismissed) {
      setPendingMessage(trimmed)
      setShowShortAnswerPrompt(true)
      return
    }
    
    // 4~29자: 패턴 체크 후 유도 (이미 거절한 경우 제외)
    if (trimmed.length < MIN_SOFT_LENGTH && !shortAnswerDismissed) {
      // 유효한 패턴이면 바로 전송
      if (hasValidPattern(trimmed)) {
        handleSendMessage(trimmed)
        return
      }
      // 패턴 없으면 확인 모달
      setPendingMessage(trimmed)
      setShowShortAnswerPrompt(true)
      return
    }
    
    // 바로 전송
    handleSendMessage(trimmed)
  }
  
  const handleSendMessage = async (messageToSend?: string) => {
    const userMessage = messageToSend || pendingMessage
    if (!userMessage || sending || generating) return

    // 모달 닫기
    setShowShortAnswerPrompt(false)
    setPendingMessage('')
    setFailedMessage(null)
    setErrorType(null)
    setError(null)
    
    setSending(true)
    setInputText('')

    try {
      const response = await fetch('/api/respond/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          content: userMessage,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        // 실패 시 내용 복구
        setFailedMessage(userMessage)
        setInputText(userMessage)
        setErrorType('server')
        setError('일시적인 문제가 있어요. 다시 시도해주세요.')
        setSending(false)
        return
      }

      // 성공 시 짧은 답변 거절 상태 초기화 (다음 질문에서는 다시 체크)
      setShortAnswerDismissed(false)
      
      await reloadMessages()
      await generateNextQuestion()
    } catch (error: any) {
      console.error('Failed to send message:', error)
      // 실패 시 내용 복구
      setFailedMessage(userMessage)
      setInputText(userMessage)
      
      // 에러 유형 분류
      if (error?.message?.includes('fetch') || error?.name === 'TypeError' || !navigator.onLine) {
        setErrorType('network')
        setError('연결이 잠시 불안정했어요. 다시 시도해주세요.')
      } else {
        setErrorType('server')
        setError('일시적인 문제가 있어요. 다시 시도해주세요.')
      }
    }

    setSending(false)
  }
  
  // 짧은 답변 모달에서 "조금 더 적기" 선택
  const handleAddMore = () => {
    setInputText(pendingMessage)
    setShowShortAnswerPrompt(false)
    setPendingMessage('')
    // 입력창에 포커스
    setTimeout(() => inputRef.current?.focus(), 100)
  }
  
  // 짧은 답변 모달에서 "그대로 보내기" 선택
  const handleSendAnyway = () => {
    setShortAnswerDismissed(true) // 이 질문에서는 더 이상 팝업 안 함
    handleSendMessage(pendingMessage)
  }

  const generateNextQuestion = async () => {
    if (!sessionInfo) return
    
    setGenerating(true)

    try {
      const { data: currentMessages } = await supabase
        .rpc('get_messages_by_token', { p_token: token })

      const response = await fetch('/api/respond/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          subjectName: sessionInfo.subject_name,
          subjectRelation: sessionInfo.subject_relation,
          messages: currentMessages?.map((m: Message) => ({ role: m.role, content: m.content })) || [],
          isFirst: false,
        }),
      })

      const data = await response.json()

      if (data.question) {
        await reloadMessages()
      }
    } catch (error) {
      console.error('Failed to generate question:', error)
    }

    setGenerating(false)
  }

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id)
    setEditText(message.content)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim() || editSaving) return
    
    setEditSaving(true)
    const newContent = editText.trim()

    try {
      const response = await fetch('/api/respond/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newContent,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || '수정에 실패했습니다.')
        setEditSaving(false)
        return
      }

      setEditingMessageId(null)
      setEditText('')
      await reloadMessages()

      if (data.shouldRegenerate) {
        await generateNextQuestion()
      }
    } catch (error) {
      console.error('Failed to save edit:', error)
      setError('수정에 실패했습니다.')
    }

    setEditSaving(false)
  }

  // 스타일 클래스 (모드에 따라)
  const styles = {
    // 기본 모드
    normal: {
      headerTitle: 'text-xl font-semibold',
      questionText: 'text-lg leading-relaxed',
      bodyText: 'text-base leading-relaxed',
      buttonHeight: 'py-3',
      buttonText: 'text-base',
      input: 'text-base min-h-[120px]',
      spacing: 'p-5',
      card: 'rounded-2xl',
    },
    // 큰 글씨 모드
    large: {
      headerTitle: 'text-2xl font-bold',
      questionText: 'text-2xl leading-relaxed font-medium',
      bodyText: 'text-xl leading-relaxed',
      buttonHeight: 'py-4',
      buttonText: 'text-xl',
      input: 'text-xl min-h-[160px]',
      spacing: 'p-7',
      card: 'rounded-3xl',
    },
  }
  
  const s = largeMode ? styles.large : styles.normal

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600 text-lg">불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error && !sessionInfo) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className={`max-w-lg w-full bg-white ${s.card} shadow-sm ${s.spacing} text-center`}>
          <div className="text-5xl mb-4">😔</div>
          <h1 className={`${s.headerTitle} text-stone-900 mb-3`}>
            링크를 열 수 없습니다
          </h1>
          <p className={`${s.bodyText} text-stone-600 mb-6`}>
            {error}
          </p>
          <p className="text-stone-500">
            링크를 보내주신 분께 문의해주세요.
          </p>
        </div>
      </div>
    )
  }

  // 마지막 AI 질문과 마지막 사용자 답변 찾기
  const lastAiMessage = messages.filter(m => m.role === 'ai').slice(-1)[0]
  const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]
  const waitingForAnswer = messages.length > 0 && messages[messages.length - 1]?.role === 'ai'

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className={`${s.headerTitle} text-stone-900`}>
            {sessionInfo?.subject_name}님의 이야기
          </h1>
          
          {/* 글씨 크기 토글 - 행동 중심 라벨 */}
          <button
            onClick={toggleLargeMode}
            className={`flex items-center gap-2 px-4 ${s.buttonHeight} ${s.buttonText} 
                       rounded-full border-2 transition-colors
                       bg-white text-stone-600 border-stone-300 hover:border-stone-500 hover:bg-stone-50`}
          >
            <span className="text-lg">가</span>
            <span>{largeMode ? '글씨 작게' : '글씨 크게'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6">
        {/* 에러 알림 */}
        {error && sessionInfo && (
          <div className={`bg-red-50 border border-red-200 ${s.card} ${s.spacing} mb-5`}>
            <p className={`text-red-700 ${s.bodyText}`}>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-red-600 underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* 이전 대화 (접힌 상태, 점진적 공개) */}
        {messages.length > 2 && (
          <details className={`mb-5 bg-white ${s.card} border border-stone-200`}>
            <summary className={`px-5 py-3 ${s.bodyText} text-stone-500 cursor-pointer hover:bg-stone-50 rounded-t-2xl`}>
              이전 대화 보기 ({Math.floor((messages.length - 2) / 2) + 1}개 질문)
            </summary>
            <div className="px-5 pb-5 space-y-3">
              {/* 최근 6개(질문3개+답변3개)만 먼저 표시, 나머지는 "더 보기" */}
              {(() => {
                const historyMessages = messages.slice(0, -2)
                const recentMessages = showAllHistory ? historyMessages : historyMessages.slice(-6)
                const hasMore = historyMessages.length > 6 && !showAllHistory
                
                return (
                  <>
                    {hasMore && (
                      <button
                        onClick={() => setShowAllHistory(true)}
                        className={`w-full py-2 ${s.bodyText} text-stone-400 hover:text-stone-600`}
                      >
                        + {historyMessages.length - 6}개 더 보기
                      </button>
                    )}
                    {recentMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-xl ${
                          message.role === 'ai'
                            ? 'bg-stone-100 text-stone-700'
                            : 'bg-stone-200 text-stone-800 ml-6'
                        }`}
                      >
                        <p className={`${s.bodyText} whitespace-pre-wrap`}>
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </>
                )
              })()}
            </div>
          </details>
        )}

        {/* 현재 질문 */}
        {lastAiMessage && waitingForAnswer && !editingMessageId && (
          <div className={`bg-white ${s.card} border border-stone-200 ${s.spacing} mb-5 shadow-sm`}>
            <p className="text-stone-400 text-sm mb-2">질문</p>
            <p className={`${s.questionText} text-stone-900`}>
              {lastAiMessage.content}
            </p>
          </div>
        )}

        {/* 마지막 답변 (수정 가능) */}
        {lastUserMessage && !waitingForAnswer && !editingMessageId && (
          <div className={`bg-stone-100 ${s.card} ${s.spacing} mb-5`}>
            <p className="text-stone-400 text-sm mb-2">내 답변</p>
            <p className={`${s.bodyText} text-stone-800 mb-4`}>
              {lastUserMessage.content}
            </p>
            {!generating && !sending && (
              <button
                onClick={() => handleStartEdit(lastUserMessage)}
                className={`${s.bodyText} text-stone-500 hover:text-stone-700 underline underline-offset-2`}
              >
                수정하기
              </button>
            )}
          </div>
        )}

        {/* 수정 모드 */}
        {editingMessageId && (
          <div className={`bg-white ${s.card} border-2 border-amber-400 ${s.spacing} mb-5 shadow-sm`}>
            <p className={`${s.bodyText} text-stone-700 mb-3 font-medium`}>답변 수정</p>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className={`w-full ${s.input} p-4 border border-stone-300 ${s.card} 
                         focus:outline-none focus:border-stone-500 resize-none`}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCancelEdit}
                disabled={editSaving}
                className={`flex-1 ${s.buttonHeight} ${s.buttonText} text-stone-600 
                           bg-stone-100 ${s.card} hover:bg-stone-200 transition-colors`}
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className={`flex-1 ${s.buttonHeight} ${s.buttonText} text-white 
                           bg-stone-800 ${s.card} hover:bg-stone-900 transition-colors
                           disabled:opacity-50`}
              >
                {editSaving ? '저장 중...' : '완료'}
              </button>
            </div>
          </div>
        )}

        {/* 답변 입력 */}
        {waitingForAnswer && !editingMessageId && (
          <div className={`bg-white ${s.card} border border-stone-200 ${s.spacing} shadow-sm`}>
            <label className={`block ${s.bodyText} text-stone-600 mb-3`}>
              답변을 입력해주세요
            </label>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="여기에 적어주세요..."
              className={`w-full ${s.input} p-4 border border-stone-300 ${s.card}
                         focus:outline-none focus:border-stone-500 resize-none 
                         placeholder:text-stone-400`}
              disabled={sending || generating}
            />
            
            {/* 버튼 + 안내문 */}
            <div className="mt-4">
              <p className="text-stone-400 text-sm mb-3 text-center">
                천천히 생각하시고 편하게 답변해주세요
              </p>
              <button
                onClick={handleTrySend}
                disabled={!inputText.trim() || sending || generating}
                className={`w-full ${s.buttonHeight} ${s.buttonText} font-medium ${s.card} transition-all
                           ${sending 
                             ? 'bg-stone-400 text-white cursor-wait'
                             : inputText.trim() 
                               ? 'bg-stone-800 text-white hover:bg-stone-900' 
                               : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                           }`}
              >
                {sending ? '전송 중...' : failedMessage ? '다시 시도' : '보내기'}
              </button>
            </div>
          </div>
        )}

        {/* 다음 질문 준비 중 */}
        {generating && (
          <div className={`bg-stone-100 ${s.card} ${s.spacing} text-center`}>
            <div className="w-8 h-8 border-3 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
            <p className={`${s.bodyText} text-stone-600`}>
              다음 질문을 준비하고 있어요...
            </p>
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-8" />
        
        <div ref={messagesEndRef} />
      </main>
      
      {/* 짧은 답변 확인 모달 */}
      {showShortAnswerPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className={`bg-white ${s.card} ${s.spacing} max-w-md w-full shadow-xl`}>
            <p className={`${s.bodyText} text-stone-700 mb-2 font-medium`}>
              조금만 더 들려주시면
            </p>
            <p className={`${s.bodyText} text-stone-600 mb-6`}>
              더 좋은 이야기로 정리할 수 있어요.
              <br />
              <span className="text-stone-400 text-sm">(선택이에요, 그대로 보내셔도 됩니다)</span>
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleSendAnyway}
                className={`flex-1 ${s.buttonHeight} ${s.buttonText} text-stone-600 
                           bg-stone-100 ${s.card} hover:bg-stone-200 transition-colors`}
              >
                그대로 보내기
              </button>
              <button
                onClick={handleAddMore}
                className={`flex-1 ${s.buttonHeight} ${s.buttonText} text-white 
                           bg-stone-800 ${s.card} hover:bg-stone-900 transition-colors`}
              >
                조금 더 적기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
