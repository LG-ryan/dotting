import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * DOTTING Button v1.3 (UX/UI Guidelines v1.2)
 * 
 * 핵심 원칙:
 * - 기본 높이 56px (h-14) - 유니버설 디자인
 * - "화면당 Primary CTA 1개" (문서화 + 코드 리뷰로 관리)
 * - 절제된 Variants (4개: default, ghost, outline, destructive)
 * - 터치 최적화 (touch-action-manipulation)
 * - Heritage 자동 대응 (CSS 변수)
 * - 브랜드 컬러 시스템 준수
 */

// Deprecated 타입 매핑
const DEPRECATED_VARIANT_MAP = {
  secondary: 'outline',
  link: 'ghost',
  celebration: 'default',
} as const

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--dotting-warm-amber)] touch-action-manipulation",
  {
    variants: {
      variant: {
        // Primary CTA - Deep Navy (화면당 1개 원칙)
        default: 
          "bg-[var(--dotting-deep-navy)] text-white font-semibold shadow-[0_2px_4px_var(--shadow-accent)] hover:bg-[#2A4A6F] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_var(--shadow-accent)] active:scale-[0.97] active:translate-y-0 disabled:opacity-50",
        
        // Outline - 보조 CTA (취소, 뒤로가기)
        outline:
          "bg-transparent border border-[var(--dotting-border)] text-[var(--dotting-deep-navy)] font-medium hover:bg-[var(--dotting-warm-gray)] hover:border-[var(--dotting-deep-navy)] active:scale-[0.98] disabled:opacity-50",
        
        // Ghost - 텍스트만 (최소 강조)
        ghost:
          "bg-transparent text-[var(--dotting-muted-gray)] font-normal hover:text-[var(--dotting-deep-navy)] hover:bg-[var(--dotting-warm-gray)] active:scale-[0.98] disabled:opacity-50",
        
        // Destructive - 삭제/위험 액션
        destructive:
          "bg-[var(--dotting-rose-pink)] text-white font-semibold hover:bg-[#DC2F4E] active:scale-[0.97] disabled:opacity-50",
        
        // ===== Deprecated (레거시 호환) =====
        // @deprecated Use 'outline' instead
        secondary:
          "bg-transparent border border-[var(--dotting-border)] text-[var(--dotting-deep-navy)] font-medium hover:bg-[var(--dotting-warm-gray)] disabled:opacity-50",
        
        // @deprecated Use 'ghost' instead
        link: 
          "bg-transparent text-[var(--dotting-deep-navy)] underline-offset-4 hover:underline disabled:opacity-50",
        
        // @deprecated Use 'default' with Warm Amber background
        celebration:
          "bg-[var(--dotting-warm-amber)] text-[var(--dotting-deep-navy)] font-semibold shadow-lg hover:bg-[#E08E09] hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] active:translate-y-0 disabled:opacity-50",
      },
      size: {
        // v1.5: 실제 랜딩 기준 (더 작게)
        sm: "h-8 px-3 text-sm",           // 32px, 14px - Navigation
        default: "h-10 px-5 text-sm",     // 40px, 14px - 일반 액션
        lg: "h-11 px-6 text-base",        // 44px, 16px - Section CTA
        xl: "h-12 px-8 text-base",        // 48px, 16px - Hero CTA
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  // Deprecated 경고 (개발 모드)
  if (process.env.NODE_ENV === 'development') {
    if (variant && variant in DEPRECATED_VARIANT_MAP) {
      const recommended = DEPRECATED_VARIANT_MAP[variant as keyof typeof DEPRECATED_VARIANT_MAP]
      console.warn(
        `[DOTTING] Button variant "${variant}" is deprecated. Use "${recommended}" instead.\n` +
        `See: UX/UI Guidelines v1.2 - Button System`
      )
    }
  }

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
