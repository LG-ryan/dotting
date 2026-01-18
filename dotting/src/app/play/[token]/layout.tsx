import type { Metadata } from 'next'

/**
 * 오디오 플레이어 전용 레이아웃
 * 
 * 최소한의 구조:
 * - 헤더/푸터 제거 (몰입 경험)
 * - 전체 화면 활용
 * - 모바일 최적화
 */

export const metadata: Metadata = {
  title: 'DOTTING - 목소리를 간직하다',
  description: '모든 이야기는 계속됩니다',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // 시니어 오조작 방지
  },
  themeColor: '#FDF8F3', // Soft Cream
}

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--dotting-soft-cream)]">
      {/* 종이 질감 오버레이 */}
      <div className="texture-overlay" />
      
      {/* 플레이어 컨텐츠 */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}
