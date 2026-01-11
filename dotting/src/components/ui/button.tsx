import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-[var(--dotting-warm-gold)] text-[var(--dotting-deep-navy)] font-semibold hover:bg-[#C49660] disabled:bg-[#E8DFD3] disabled:text-[#A09080]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 disabled:opacity-60",
        outline:
          "border-2 border-[var(--dotting-deep-navy)] text-[var(--dotting-deep-navy)] bg-transparent hover:bg-[var(--dotting-deep-navy)]/10 disabled:border-[#B0B8C0] disabled:text-[#B0B8C0]",
        secondary:
          "bg-[var(--dotting-deep-navy)] text-white font-semibold hover:bg-[#2A4A6F] disabled:bg-[#8090A0] disabled:text-[#D0D8E0]",
        ghost:
          "hover:bg-[var(--dotting-deep-navy)]/10 hover:text-[var(--dotting-deep-navy)] disabled:text-[#B0B8C0]",
        link: "text-[var(--dotting-warm-brown)] underline-offset-4 hover:underline disabled:text-[#B0B8C0]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
