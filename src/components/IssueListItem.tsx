import type { ReactNode } from "react"

interface IssueListItemProps {
  issueKey: string
  summary?: string
  action: ReactNode
}

export function IssueListItem({ issueKey, summary, action }: IssueListItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex flex-col overflow-hidden">
        <span className="font-medium text-sm">{issueKey}</span>
        {summary && (
          <span className="text-xs text-muted-foreground truncate" title={summary}>
            {summary}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}
