'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { triggerHaptic } from '@/lib/haptic'

interface ArchiveDownloadButtonProps {
  orderId: string
  sessionId: string
  subjectName: string
  className?: string
}

type ArchiveStatus = 'not_started' | 'generating' | 'ready' | 'failed'
type RetryStage = 'auto' | 'manual' | 'email'

export function ArchiveDownloadButton({
  orderId,
  sessionId,
  subjectName,
  className = '',
}: ArchiveDownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [progress, setProgress] = useState(0)
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null)
  const [status, setStatus] = useState<ArchiveStatus>('not_started')
  const [retryCount, setRetryCount] = useState(0)
  const [retryStage, setRetryStage] = useState<RetryStage>('auto')
  const [showEmailOption, setShowEmailOption] = useState(false)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const prevEstimateRef = useRef<number>(0)

  // 적응형 폴링 간격 계산
  const getPollingInterval = (currentProgress: number): number => {
    if (currentProgress < 30) return 500   // 초반: 빠른 피드백
    if (currentProgress < 80) return 1000  // 중반: 표준
    return 2000                            // 후반: 여유
  }

  // 예상 시간 보간 (부드러운 전환)
  const smoothEstimate = (rawEstimate: number): number => {
    const rounded = Math.ceil(rawEstimate / 5) * 5  // 5초 단위 반올림
    const prev = prevEstimateRef.current
    
    // 이전 값과 큰 차이 나면 천천히 전환 (lerp)
    const smoothed = prev + (rounded - prev) * 0.3
    prevEstimateRef.current = smoothed
    
    return Math.ceil(smoothed)
  }

  // 진행률 애니메이션 (Cubic-bezier)
  const animateProgress = (from: number, to: number, duration: number) => {
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progressPercent = Math.min(elapsed / duration, 1)
      
      // cubic-bezier(0.4, 0, 0.2, 1) - Ink Spread
      const t = progressPercent
      const eased = t * t * (3 - 2 * t)
      
      const current = from + (to - from) * eased
      setProgress(current)
      
      if (progressPercent < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }

  // 다운로드 시작
  const handleDownload = async () => {
    setLoading(true)
    setShowModal(true)
    setProgress(0)
    setStatus('generating')
    setRetryCount(0)
    setRetryStage('auto')
    setShowEmailOption(false)
    triggerHaptic('light')

    try {
      // 생성 요청
      const generateRes = await fetch(`/api/orders/${orderId}/archive/generate`, {
        method: 'POST',
      })

      if (!generateRes.ok) {
        throw new Error('생성 요청 실패')
      }

      const generateData = await generateRes.json()

      // 이미 생성된 경우 바로 다운로드
      if (generateData.status === 'already_exists') {
        await downloadArchive()
        return
      }

      // 생성 중인 경우 폴링 시작
      startPolling()

    } catch (error) {
      console.error('Archive generation failed:', error)
      await handleRetry()
    }
  }

  // 폴링 시작
  const startPolling = () => {
    const poll = async () => {
      try {
        const statusRes = await fetch(`/api/orders/${orderId}/archive/status`)
        
        if (!statusRes.ok) {
          throw new Error('상태 조회 실패')
        }

        const statusData = await statusRes.json()
        
        // 진행률 업데이트
        if (statusData.progress !== undefined) {
          const newProgress = statusData.progress
          
          // 99%에서 멈춤 (봉인 여운)
          if (newProgress === 99 && progress < 99) {
            animateProgress(progress, 99, 800)
            
            // 1.5초 대기
            setTimeout(() => {
              // 마지막 1% 천천히
              if (statusData.status === 'ready') {
                animateProgress(99, 100, 800)
                setTimeout(() => {
                  triggerHaptic('heavy')
                }, 800)
              }
            }, 1500)
          } else if (newProgress < 99) {
            animateProgress(progress, newProgress, 500)
          }
        }
        
        // 예상 시간 업데이트
        if (statusData.estimatedSeconds !== undefined) {
          setEstimatedSeconds(smoothEstimate(statusData.estimatedSeconds))
        }
        
        setStatus(statusData.status)
        
        // 완료
        if (statusData.status === 'ready') {
          stopPolling()
          await downloadArchive()
          return
        }
        
        // 실패
        if (statusData.status === 'failed') {
          stopPolling()
          await handleRetry()
          return
        }
        
        // 다음 폴링 예약 (적응형 간격)
        const interval = getPollingInterval(progress)
        pollingIntervalRef.current = setTimeout(poll, interval)
        
      } catch (error) {
        console.error('Polling failed:', error)
        stopPolling()
        await handleRetry()
      }
    }
    
    poll()
  }

  // 폴링 중지
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // 재시도 로직 (3단계)
  const handleRetry = async () => {
    const newRetryCount = retryCount + 1
    setRetryCount(newRetryCount)
    
    if (newRetryCount === 1) {
      // 1차 실패: 자동 재시도
      setRetryStage('auto')
      triggerHaptic('medium')
      
      // 잠시 대기 후 자동 재시도
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setProgress(0)
      setStatus('generating')
      
      const generateRes = await fetch(`/api/orders/${orderId}/archive/generate`, {
        method: 'POST',
      })
      
      if (generateRes.ok) {
        startPolling()
      } else {
        await handleRetry()
      }
      
    } else if (newRetryCount === 2) {
      // 2차 실패: 수동 재시도 제안
      setRetryStage('manual')
      triggerHaptic('medium')
      
    } else {
      // 3차 실패: 이메일 대안 제시
      setRetryStage('email')
      setShowEmailOption(true)
      triggerHaptic('heavy')
    }
  }

  // 수동 재시도
  const handleManualRetry = async () => {
    setProgress(0)
    setStatus('generating')
    setRetryStage('auto')
    triggerHaptic('light')
    
    const generateRes = await fetch(`/api/orders/${orderId}/archive/generate`, {
      method: 'POST',
    })
    
    if (generateRes.ok) {
      startPolling()
    } else {
      await handleRetry()
    }
  }

  // 이메일로 받기
  const handleEmailRequest = async () => {
    try {
      // TODO: 이메일 요청 API 구현
      // await fetch(`/api/orders/${orderId}/archive/email`, { method: 'POST' })
      
      triggerHaptic('medium')
      setShowModal(false)
      
      alert('📧 유산 상자 준비가 완료되면\n이메일로 다운로드 링크를 보내드릴게요')
      
    } catch (error) {
      console.error('Email request failed:', error)
    }
  }

  // 다운로드 실행
  const downloadArchive = async () => {
    try {
      const downloadRes = await fetch(`/api/orders/${orderId}/archive/download`)

      if (!downloadRes.ok) {
        throw new Error('다운로드 URL 생성 실패')
      }

      const downloadData = await downloadRes.json()

      // 다운로드 시작
      const link = document.createElement('a')
      link.href = downloadData.downloadUrl
      link.download = `${subjectName}_이야기_DOTTING.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 완료 피드백
      triggerHaptic('heavy')
      setShowModal(false)
      setLoading(false)

      // 토스트 메시지
      setTimeout(() => {
        alert('📦 유산 상자가 준비됐어요\n언제든 다시 다운로드할 수 있어요')
      }, 500)

    } catch (error) {
      console.error('Download failed:', error)
      await handleRetry()
    }
  }

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  return (
    <>
      <Button
        size="default"
        onClick={handleDownload}
        disabled={loading}
        className={className}
      >
        📦 유산 상자 간직하기
      </Button>

      {/* 로딩 모달 */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            // 배경 클릭 시 닫기
            if (e.target === e.currentTarget) {
              stopPolling()
              setShowModal(false)
              setLoading(false)
              setProgress(0)
              setStatus('not_started')
            }
          }}
        >
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-6 shadow-2xl relative">
            
            {/* 정상 진행 중 */}
            {!showEmailOption && retryStage !== 'manual' && (
              <>
                <h3 className="text-xl font-bold text-[var(--dotting-deep-navy)] mb-6 text-center leading-relaxed">
                  {retryCount === 1 ? '잠시 문제가 있었어요\n다시 시도할게요' : '유산 상자를 준비하고 있어요'}
                </h3>

                {/* 진행 바 */}
                <div className="mb-4">
                  {/* 99% 봉인 문구 */}
                  {progress >= 99 && progress < 100 && (
                    <p 
                      className="text-sm text-center text-[var(--dotting-deep-navy)] mb-3 animate-fade-in"
                      style={{
                        animation: 'fadeIn 0.5s ease-in',
                      }}
                    >
                      상자를 소중히 봉인하고 있습니다
                    </p>
                  )}
                  
                  <div className="h-2 bg-[var(--dotting-warm-gray)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--dotting-warm-amber)] transition-all"
                      style={{
                        width: `${progress}%`,
                        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-[var(--dotting-muted-gray)]">
                      {Math.round(progress)}%
                    </p>
                    
                    {estimatedSeconds !== null && estimatedSeconds > 0 && progress < 99 && (
                      <p 
                        className="text-sm text-[var(--dotting-muted-gray)] transition-opacity duration-300"
                        style={{ opacity: 1 }}
                      >
                        약 {estimatedSeconds}초 남았어요
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-center text-[var(--dotting-muted-gray)] leading-relaxed mb-4">
                  이 상자는 인터넷 없이도<br />
                  영원히 열 수 있어요
                </p>

                {/* 나중에 받기 버튼 */}
                <button
                  onClick={() => {
                    stopPolling()
                    setShowModal(false)
                    setLoading(false)
                    setProgress(0)
                    setStatus('not_started')
                  }}
                  className="w-full text-center text-sm text-[var(--dotting-muted-gray)] hover:text-[var(--dotting-deep-navy)] transition-colors py-2"
                >
                  나중에 받기
                </button>

                <style jsx>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              </>
            )}

            {/* 2차 실패: 수동 재시도 */}
            {retryStage === 'manual' && !showEmailOption && (
              <>
                <h3 className="text-lg font-bold text-[var(--dotting-deep-navy)] mb-3 text-center">
                  상자가 조금 무거워<br />시간이 걸리네요
                </h3>
                
                <p className="text-sm text-center text-[var(--dotting-muted-gray)] mb-6 leading-relaxed">
                  다시 시도하거나<br />
                  나중에 받으실 수 있어요
                </p>

                <div className="flex gap-2">
                  <Button
                    size="default"
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false)
                      setLoading(false)
                    }}
                    className="flex-1"
                  >
                    나중에 받기
                  </Button>
                  <Button
                    size="default"
                    onClick={handleManualRetry}
                    className="flex-1"
                  >
                    다시 시도하기
                  </Button>
                </div>
              </>
            )}

            {/* 3차 실패: 이메일 대안 */}
            {showEmailOption && (
              <>
                <h3 className="text-lg font-bold text-[var(--dotting-deep-navy)] mb-4 text-center leading-relaxed">
                  상자가 아주 무겁고 소중하여
                </h3>
                
                <p className="text-sm text-center text-[var(--dotting-muted-gray)] mb-8 leading-loose px-2">
                  저희가 정성껏 포장해<br />
                  메일로 배달해 드릴까요?
                </p>

                <div className="flex gap-3 px-2">
                  <Button
                    size="default"
                    variant="ghost"
                    onClick={() => {
                      setShowModal(false)
                      setLoading(false)
                    }}
                    className="flex-1"
                  >
                    닫기
                  </Button>
                  <Button
                    size="default"
                    onClick={handleEmailRequest}
                    className="flex-1"
                  >
                    📧 메일로 받기
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
