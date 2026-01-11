/**
 * 결제 관련 상수 (클라이언트/서버 공용)
 * 서버 전용 코드와 분리하여 클라이언트에서도 import 가능
 */

import type { PackageType } from '@/types/database'

/**
 * 패키지별 가격 (TBD - 테스트 후 확정)
 */
export const PACKAGE_PRICES: Record<PackageType, number> = {
  pdf_only: 49000,
  standard: 89000,
  premium: 129000,
}

/**
 * 패키지 정보
 */
export const PACKAGES: Record<PackageType, {
  name: string
  price: number
  description: string
  features: string[]
}> = {
  pdf_only: {
    name: 'PDF 전용',
    price: PACKAGE_PRICES.pdf_only,
    description: 'PDF 다운로드만 제공',
    features: ['PDF 다운로드', '20개 이야기', '2회 무료 수정'],
  },
  standard: {
    name: '스탠다드',
    price: PACKAGE_PRICES.standard,
    description: '하드커버 1권 포함',
    features: ['PDF + 하드커버 책 1권', '20개 이야기 (50페이지+)', '2회 무료 수정', '무료 배송'],
  },
  premium: {
    name: '프리미엄',
    price: PACKAGE_PRICES.premium,
    description: '하드커버 2권 포함',
    features: ['PDF + 하드커버 책 2권', '30개+ 이야기 (100페이지+)', '3회 무료 수정', '무료 배송'],
  },
}
