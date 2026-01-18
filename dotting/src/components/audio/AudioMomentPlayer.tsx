'use client'

import { useState, useRef, useEffect } from 'react'
import { triggerHaptic } from '@/lib/haptic'

interface Moment {
  id: string
  title: string
  audio_url: string
  duration: number
  order_index: number
}

interface AudioMomentPlayerProps {
  moments: Moment[]
  recipientName: string
  packageType: 'prologue' | 'essay' | 'story' | 'heritage'
}

export default function AudioMomentPlayer({
  moments,
  recipientName,
  packageType
}: AudioMomentPlayerProps) {
  // State
  const [showSplash, setShowSplash] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null)
  const transitionTimeoutRef = useRef<NodeJS.Timeout>()

  const currentMoment = moments[currentIndex]
  const nextMoment = moments[currentIndex + 1]
  const isHeritage = packageType === 'heritage'

  // 1. Splash → Player: "목소리를 깨우는 의식"
  const handleWakeVoice = async () => {
    // [0ms] 햅틱 20ms 발동 + 버튼 반응
    triggerHaptic('medium') // 20ms

    // [100ms] 오디오 재생 시작 (촉각 → 청각)
    setTimeout(async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch (error) {
          console.error('Audio play failed:', error)
        }
      }
    }, 100)

    // [200ms] Splash Fade Out 시작
    setTimeout(() => {
      setShowSplash(false)
    }, 200)
  }

  // 2. 오디오 종료 시 0.8초 전환 시퀀스
  const handleAudioEnded = () => {
    if (!nextMoment) {
      setIsPlaying(false)
      return
    }

    setIsTransitioning(true)

    // [0.0s] 미리보기 등장
    setShowPreview(true)

    // [0.6s] 미리보기 퇴장 + 새 순간 시작
    transitionTimeoutRef.current = setTimeout(() => {
      setShowPreview(false)
      setCurrentIndex(prev => prev + 1)
      setIsTransitioning(false)
      setCurrentTime(0)

      // [0.8s] 햅틱 + 재생
      setTimeout(() => {
        triggerHaptic('light') // 10ms
        audioRef.current?.play()
      }, 200)
    }, 600)
  }

  // 3. 수동 제어
  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
      triggerHaptic('light')
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setCurrentTime(0)
      triggerHaptic('light')
      audioRef.current?.play()
    }
  }

  const handleNext = () => {
    if (nextMoment) {
      setCurrentIndex(prev => prev + 1)
      setCurrentTime(0)
      triggerHaptic('light')
      audioRef.current?.play()
    }
  }

  // 4. 디지털 유산 소장 (ZIP 다운로드)
  const handleDownloadArchive = async () => {
    triggerHaptic('medium')
    
    try {
      const response = await fetch('/api/moments/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ momentIds: moments.map(m => m.id) })
      })

      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipientName}-moments.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      triggerHaptic('light')
    } catch (error) {
      console.error('Archive download failed:', error)
      // TODO: Toast 시스템 연결
      alert('잠시 후 다시 시도해 주세요')
    }
  }

  // 시간 업데이트
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('ended', handleAudioEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('ended', handleAudioEnded)
    }
  }, [currentIndex, nextMoment])

  // Cleanup
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-moment-player">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentMoment.audio_url}
        preload="auto"
      />

      {/* Splash Screen */}
      {showSplash && (
        <div 
          className={`splash-screen ${isHeritage ? 'heritage' : ''} ${!showSplash ? 'fading' : ''}`}
          data-theme={packageType}
        >
          <div className="splash-content">
            {/* 책 일러스트 (Breathing) */}
            <div className="book-illustration">
              <div className="book-icon">📖</div>
            </div>

            <h2 className="splash-title">
              {recipientName}님의 목소리를 불러왔습니다
            </h2>

            {/* 재생 버튼 */}
            <button
              onClick={handleWakeVoice}
              className={`splash-play-button ${isHeritage ? 'heritage' : ''}`}
              aria-label="목소리 듣기 시작"
            >
              <span className="play-icon">▶</span>
            </button>

            <p className="splash-subtitle">
              화면을 터치하여 들어보세요
            </p>

            {/* 점 표시 */}
            <div className="splash-dots">
              <span className="dot filled">●</span>
              <span className="dot filled">●</span>
              <span className="dot filled">●</span>
              <span className="dot-label">{moments.length}개의 소중한 순간</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Player */}
      {!showSplash && (
        <div className={`player-container ${isTransitioning ? 'transitioning' : ''}`}>
          {/* 상단: 제목 영역 */}
          <div className="player-header">
            <h1 className="player-title">{recipientName}님의 소중한 순간</h1>
            <p className="player-subtitle">{moments.length}개의 이야기</p>
          </div>

          {/* 중앙: 재생 영역 */}
          <div className="player-main">
            {/* 현재 순간 제목 */}
            <div className="current-moment">
              <h2 className="moment-title">{currentMoment.title}</h2>
              <p className="moment-number">
                {currentIndex + 1} / {moments.length}
              </p>
            </div>

            {/* 파형 시각화 영역 */}
            <div className={`waveform ${isPlaying ? 'playing' : ''}`}>
              <div className="waveform-bars">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="waveform-bar" />
                ))}
              </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${(currentTime / currentMoment.duration) * 100}%` 
                  }}
                />
              </div>
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentMoment.duration)}</span>
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="player-controls">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="control-button"
                aria-label="이전 순간"
              >
                ←
              </button>

              <button
                onClick={handlePlayPause}
                className="control-button primary"
                aria-label={isPlaying ? '일시정지' : '재생'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                onClick={handleNext}
                disabled={!nextMoment}
                className="control-button"
                aria-label="다음 순간"
              >
                →
              </button>
            </div>
          </div>

          {/* 전환 효과: 점 + 미리보기 */}
          {isTransitioning && (
            <>
              {/* Ink Spread Dot */}
              <div className={`transition-dot ${isHeritage ? 'heritage' : ''}`} />

              {/* 다음 순간 미리보기 */}
              {showPreview && nextMoment && (
                <div className="next-moment-preview">
                  <div className="preview-icon">🎵</div>
                  <h3 className="preview-title">{nextMoment.title}</h3>
                  <p className="preview-duration">
                    {formatTime(nextMoment.duration)}
                  </p>
                </div>
              )}
            </>
          )}

          {/* 하단: 유산 소장 버튼 */}
          <div className="player-footer">
            <button
              onClick={handleDownloadArchive}
              className="archive-button"
              aria-label="목소리를 ZIP 파일로 다운로드"
            >
              <span className="archive-icon">□</span>
              <span className="archive-text">
                목소리를 영원히 간직하기
                <span className="archive-subtext">(ZIP 파일로 소장)</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
