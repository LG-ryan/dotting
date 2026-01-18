'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * DOTTING Dot Component v1.2
 * 
 * PRD v4.0 기반 패키지 정체성 시스템
 * - Prologue: ○○○ (비어있음)
 * - Essay: ●○○ (1개 채워짐)
 * - Story: ●●○ (2개 채워짐)
 * - Heritage: ●●● (모두 채워짐 + 금박)
 */

export type PackageType = 'prologue' | 'essay' | 'story' | 'heritage'

interface DotProps {
  package: PackageType
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  onFillComplete?: () => void
  className?: string
}

interface DotConfig {
  filled: [boolean, boolean, boolean]
  variant: 'default' | 'heritage'
}

const PACKAGE_CONFIG: Record<PackageType, DotConfig> = {
  prologue: { filled: [false, false, false], variant: 'default' },
  essay: { filled: [true, false, false], variant: 'default' },
  story: { filled: [true, true, false], variant: 'default' },
  heritage: { filled: [true, true, true], variant: 'heritage' },
}

export function Dot({ 
  package: pkg, 
  animated = false,
  size = 'md',
  onFillComplete,
  className 
}: DotProps) {
  const config = PACKAGE_CONFIG[pkg]
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {config.filled.map((isFilled, index) => (
        <DotItem
          key={index}
          filled={isFilled}
          variant={config.variant}
          size={size}
          animated={animated}
          onFillComplete={index === config.filled.filter(Boolean).length - 1 ? onFillComplete : undefined}
        />
      ))}
    </div>
  )
}

interface DotItemProps {
  filled: boolean
  variant: 'default' | 'heritage'
  size: 'sm' | 'md' | 'lg'
  animated: boolean
  onFillComplete?: () => void
}

function DotItem({ filled, variant, size, animated, onFillComplete }: DotItemProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const dotRef = useRef<HTMLSpanElement>(null)

  // IntersectionObserver로 화면 밖 애니메이션 중단
  useEffect(() => {
    if (!dotRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
        
        // 화면 밖이면 애니메이션 중단
        if (!entry.isIntersecting && isAnimating) {
          setIsAnimating(false)
          if (dotRef.current) {
            dotRef.current.style.willChange = 'auto'
          }
        }
      },
      { threshold: 0 }
    )

    observer.observe(dotRef.current)
    return () => observer.disconnect()
  }, [isAnimating])

  // 채우기 애니메이션
  useEffect(() => {
    if (!filled || !animated || !isVisible) return

    // will-change 힌트 (애니메이션 시작 직전)
    if (dotRef.current) {
      dotRef.current.style.willChange = 'transform, opacity'
    }

    setIsAnimating(true)

    // 애니메이션 지속 시간 (Heritage는 더 길게)
    const duration = variant === 'heritage' ? 800 : 600

    const timer = setTimeout(() => {
      setIsAnimating(false)
      
      // GPU 메모리 해제
      if (dotRef.current) {
        dotRef.current.style.willChange = 'auto'
      }

      // Haptic 피드백 (모바일)
      if ('vibrate' in navigator && window.matchMedia('(hover: none)').matches) {
        navigator.vibrate(10)
      }

      onFillComplete?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [filled, animated, variant, isVisible, onFillComplete])

  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  }

  return (
    <span
      ref={dotRef}
      className={cn(
        'dotting-dot',
        sizeClasses[size],
        'rounded-full',
        filled 
          ? variant === 'heritage'
            ? 'dotting-dot-heritage'
            : 'bg-[var(--dotting-warm-amber)]'
          : 'bg-[var(--dotting-warm-amber)]/30',
        filled && 'filled',
        isAnimating && 'is-filling'
      )}
      aria-label={filled ? '완료' : '미완료'}
      role="status"
    />
  )
}

// 편의 컴포넌트들
export function PrologueDots(props: Omit<DotProps, 'package'>) {
  return <Dot package="prologue" {...props} />
}

export function EssayDots(props: Omit<DotProps, 'package'>) {
  return <Dot package="essay" {...props} />
}

export function StoryDots(props: Omit<DotProps, 'package'>) {
  return <Dot package="story" {...props} />
}

export function HeritageDots(props: Omit<DotProps, 'package'>) {
  return <Dot package="heritage" {...props} />
}
