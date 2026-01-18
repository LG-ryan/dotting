import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[120px] w-full rounded-none border-b-2 border-input bg-transparent px-3 py-4 text-base shadow-sm placeholder:text-muted-foreground/50 placeholder:italic focus-visible:border-[var(--dotting-warm-amber)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-lg font-serif leading-relaxed caret-[var(--dotting-warm-amber)] resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
