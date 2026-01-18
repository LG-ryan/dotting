/**
 * 결제 관련 상수 (클라이언트/서버 공용)
 * 서버 전용 코드와 분리하여 클라이언트에서도 import 가능
 */

import type { PackageType } from '@/types/database'

/**
 * 패키지별 가격
 * 에센스-스토리-헤리티지 구조 (3.9-9.9-19.9만원)
 * Early Bird 할인가
 */
export const PACKAGE_PRICES: Record<PackageType, number> = {
  pdf_only: 39000,    // 에센스: 디지털 보관함
  standard: 99000,    // 스토리: 피지털 경험 (오디오 QR)
  premium: 199000,    // 헤리티지: 영구 각인 + 세대 전승
}

/**
 * 패키지별 정가 (할인 전)
 */
export const PACKAGE_ORIGINAL_PRICES: Record<PackageType, number> = {
  pdf_only: 59000,
  standard: 149000,
  premium: 299000,
}

/**
 * 패키지 정보
 */
export const PACKAGES: Record<PackageType, {
  name: string
  price: number
  description: string
  features: string[]
  dots?: string // 시각적 아이덴티티
}> = {
  pdf_only: {
    name: 'Essay',
    price: PACKAGE_PRICES.pdf_only,
    description: '에세이 - 담백한 수필',
    dots: '●○○',
    features: [
      '도팅 편집 PDF',
      '무제한 디지털 열람',
      '영구 클라우드 보관',
      '2회 무료 수정',
    ],
  },
  standard: {
    name: 'Story',
    price: PACKAGE_PRICES.standard,
    description: '스토리 - 완성된 이야기',
    dots: '●●○',
    features: [
      '프리미엄 하드커버 1권',
      '오디오 QR 코드 (목소리 보존)',
      '도팅 프리미엄 편집 PDF',
      '친환경 프리미엄 패키징',
      '3회 무료 수정',
      '무료 배송',
    ],
  },
  premium: {
    name: 'Heritage',
    price: PACKAGE_PRICES.premium,
    description: '헤리티지 - 세대를 넘는 유산',
    dots: '●●●',
    features: [
      '프리미엄 하드커버 2권 (보관용 + 전달용)',
      '특별 각인 서비스 (헌정사 인쇄)',
      '오디오 QR 코드 (목소리 보존)',
      '배송 전 티저 오디오 클립 (30초)',
      'VIP 패스트트랙 (우선 제작 처리)',
      '친환경 프리미엄 패키징 + 감사 카드',
      '도팅 헤리티지 편집 PDF',
      '5회 무료 수정',
      '무료 배송',
    ],
  },
}
