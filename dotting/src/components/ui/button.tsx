import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * DOTTING Button Variants (SSOT: design-system-v1.md)
 * 
 * - default/primary: Deep Navy 배경 + 흰 글씨 (메인 CTA)
 * - secondary: 테두리만 (보조 액션)
 * - ghost: 텍스트만 (취소/닫기)
 * - celebration: 축하 그라데이션 (성취 모먼트)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--dotting-warm-amber)]",
  {
    variants: {
      variant: {
        // Primary CTA - Deep Navy (화면당 1개 원칙)
        default: 
          "bg-[var(--dotting-deep-navy)] text-white font-semibold shadow-sm hover:bg-[#2A4A6F] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:bg-gray-300 disabled:text-gray-500",
        
        // Secondary - 테두리만 (보조 액션)
        secondary:
          "bg-transparent border border-[var(--dotting-border)] text-[var(--dotting-deep-navy)] font-medium hover:bg-gray-50 hover:border-[var(--dotting-deep-navy)] disabled:border-gray-200 disabled:text-gray-400",
        
        // Outline - 강조된 테두리
        outline:
          "bg-transparent border-2 border-[var(--dotting-deep-navy)] text-[var(--dotting-deep-navy)] font-semibold hover:bg-[var(--dotting-deep-navy)]/5 disabled:border-gray-300 disabled:text-gray-400",
        
        // Ghost - 텍스트만 (취소/닫기)
        ghost:
          "bg-transparent text-[var(--dotting-muted-gray)] font-normal hover:text-[var(--dotting-deep-navy)] hover:bg-gray-100/50 disabled:text-gray-300",
        
        // Celebration - 축하/성취 모먼트
        celebration:
          "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg hover:from-amber-600 hover:to-orange-600 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]",
        
        // Destructive
        destructive:
          "bg-red-600 text-white font-semibold hover:bg-red-700 disabled:bg-red-300",
        
        // Link
        link: 
          "bg-transparent text-[var(--dotting-deep-navy)] underline-offset-4 hover:underline disabled:text-gray-400",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",      // CTA용 큰 버튼
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
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
