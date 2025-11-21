import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/lib/utils"
import { useIssueWorklogs } from "@/services/jira.hooks"

interface WorklogHistoryProps {
  issueKey: string
}

export function WorklogHistory({ issueKey }: WorklogHistoryProps) {
  const { data, isLoading, error, refetch, isFetching } = useIssueWorklogs(issueKey)

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground text-center">Loading worklogs...</div>
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">Failed to load worklogs: {error.message}</div>
    )
  }

  if (!data || data.worklogs.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground text-center">No worklogs yet.</div>
  }

  return (
    <div className="border-t">
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-semibold">Work Log History ({data.worklogs.length})</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {data.worklogs.map((worklog) => (
            <div
              key={worklog.id}
              className="text-sm border rounded-md p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium">{worklog.author?.displayName || "Unknown"}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(worklog.started).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-primary">
                  {formatDuration(worklog.timeSpentSeconds)}
                </span>
                <span className="text-xs text-muted-foreground">({worklog.timeSpent})</span>
              </div>
              {worklog.comment && (
                <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                  {worklog.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
