'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { triggerTreasureFeedback } from '@/lib/haptic'
import type { UniversalMessage } from '@/types/database'
import { toast } from 'sonner'

/**
 * DOTTING AudioMessage Component v1.2
 * 
 * 유니버설 디자인: 시니어와 젊은 세대 모두를 위한 음성 메시지 UI
 * - 파형 시각화 (재생 상태 반응)
 * - 보물 마킹 (별표 + 카운트)
 * - Heritage 테마 대응 (금박 효과)
 * 
 * PRD v4.0 기반:
 * - 오디오 QR 코드 (물리적 책에서 재생)
 * - 30초 티저 클립 (도착 전 미리듣기)
 */

interface AudioMessageProps {
  message: UniversalMessage
  variant?: 'default' | 'heritage'
  onTreasureMark?: (messageId: string, isTreasure: boolean) => Promise<void>
  className?: string
}

export function AudioMessage({ 
  message, 
  variant = 'default',
  onTreasureMark,
  className 
}: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMarking, setIsMarking] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isTreasure = message.meta?.is_treasure ?? false
  const treasureIndex = message.meta?.treasure_index
  const duration = message.meta?.duration ?? 0
  const waveform = message.meta?.waveform ?? generateDefaultWaveform()

  // 오디오 재생/일시정지
  const togglePlayback = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        await audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    } catch (error) {
      console.error('[DOTTING] Audio playback failed:', error)
      toast.error('음성 재생에 실패했습니다')
    }
  }

  // 보물 마킹 토글
  const handleTreasureMark = async () => {
    if (isMarking || !onTreasureMark) return

    setIsMarking(true)

    // 햅틱 + 시각 효과 동기화 (10ms)
    triggerTreasureFeedback(containerRef.current)

    try {
      await onTreasureMark(message.id, !isTreasure)

      // 고대비 토스트 (12:1 명도 대비)
      // framer-motion initial 시점과 햅틱 동기화
      toast.success(
        isTreasure ? '보물 표시를 해제했습니다' : '보물로 표시했습니다',
        {
          duration: 2000,
          className: 'dotting-toast-treasure',
        }
      )
    } catch (error) {
      console.error('[DOTTING] Treasure marking failed:', error)
      toast.error('보물 표시에 실패했습니다')
    } finally {
      setIsMarking(false)
    }
  }

  // 오디오 시간 업데이트
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={cn(
        'dotting-audio-message',
        variant === 'heritage' && 'heritage',
        isTreasure && 'is-treasure',
        className
      )}
    >
      {/* 숨겨진 오디오 엘리먼트 */}
      {message.audio_url && (
        <audio ref={audioRef} src={message.audio_url} preload="metadata" />
      )}

      {/* 파형 시각화 */}
      <div className="audio-waveform-container">
        <button
          type="button"
          onClick={togglePlayback}
          className="audio-play-button"
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </button>

        <div className="audio-waveform">
          {waveform.map((amplitude, index) => {
            const barProgress = (index / waveform.length) * 100
            const isActive = barProgress <= progress

            return (
              <span
                key={index}
                className={cn(
                  'audio-waveform-bar',
                  isActive && 'active',
                  variant === 'heritage' && 'heritage'
                )}
                style={{
                  height: `${amplitude * 100}%`,
                  opacity: isActive ? 1 : 0.3,
                }}
                aria-hidden="true"
              />
            )
          })}
        </div>

        <span className="audio-duration">
          {formatTime(isPlaying ? currentTime : duration)}
        </span>
      </div>

      {/* 보물 마킹 버튼 */}
      <button
        type="button"
        onClick={handleTreasureMark}
        disabled={isMarking}
        className={cn(
          'audio-treasure-button',
          isTreasure && 'active'
        )}
        aria-label={isTreasure ? '보물 해제' : '보물로 표시'}
      >
        <StarIcon 
          className={cn(
            'w-4 h-4',
            isTreasure ? 'fill-current' : 'fill-none'
          )} 
        />
        {isTreasure && treasureIndex && (
          <span className="treasure-index">보물 {treasureIndex}</span>
        )}
      </button>
    </div>
  )
}

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 기본 파형 생성 (메타데이터가 없을 경우)
 */
function generateDefaultWaveform(): number[] {
  const length = 40
  return Array.from({ length }, () => 0.3 + Math.random() * 0.7)
}

/**
 * 시간 포맷팅 (초 → MM:SS)
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================================
// 아이콘 컴포넌트 (Heroicons 스타일)
// ============================================================

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  )
}
