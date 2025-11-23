import type { ReactNode } from "react"
import { FeedbackButton } from "@/components/FeedbackButton"

interface ViewHeaderProps {
  title: string
  actions?: ReactNode
}

export function ViewHeader({ title, actions }: ViewHeaderProps) {
  return (
    <div
      data-tauri-drag-region
      className="sticky top-0 z-100 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60 border-b shadow-sm"
    >
      <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-2 items-center">
          <FeedbackButton />
          {actions}
        </div>
      </div>
    </div>
  )
}
