/**
 * DOTTING Haptic Feedback Utility
 * 
 * 유니버설 디자인: 시니어와 젊은 세대 모두를 위한 촉각 피드백
 * - 시니어: 명확한 피드백으로 안심감 제공
 * - 젊은 세대: 세련된 인터랙션 경험
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10], // 짧은 진동 - 쉼 - 짧은 진동
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
}

/**
 * 햅틱 피드백 트리거
 * 
 * @param pattern - 진동 패턴
 * @returns 성공 여부 (지원하지 않는 환경에서는 false)
 */
export function triggerHaptic(pattern: HapticPattern = 'light'): boolean {
  // 햅틱 지원 여부 확인
  if (!('vibrate' in navigator)) {
    return false
  }

  // 데스크탑 환경에서는 햅틱 비활성화 (hover 지원 여부로 판단)
  if (window.matchMedia('(hover: hover)').matches) {
    return false
  }

  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern]
    navigator.vibrate(vibrationPattern)
    return true
  } catch (error) {
    console.warn('[DOTTING] Haptic feedback failed:', error)
    return false
  }
}

/**
 * 햅틱 + 시각 효과 동기화
 * 
 * @param element - 시각 효과를 적용할 DOM 요소
 * @param pattern - 햅틱 패턴
 * @param visualEffect - 시각 효과 CSS 클래스
 */
export function triggerSyncedFeedback(
  element: HTMLElement | null,
  pattern: HapticPattern = 'light',
  visualEffect: string = 'pulse'
): void {
  if (!element) return

  // 햅틱 피드백
  triggerHaptic(pattern)

  // 시각 효과 (애니메이션 클래스 추가)
  element.classList.add(visualEffect)

  // 애니메이션 종료 후 클래스 제거
  const duration = pattern === 'light' ? 200 : pattern === 'medium' ? 300 : 400
  setTimeout(() => {
    element.classList.remove(visualEffect)
  }, duration)
}

/**
 * 보물 마킹 전용 피드백
 * - 햅틱: 10ms (light)
 * - 시각: Amber glow
 */
export function triggerTreasureFeedback(element: HTMLElement | null): void {
  triggerSyncedFeedback(element, 'light', 'treasure-glow')
}
