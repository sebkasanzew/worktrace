import { Pencil, RefreshCw } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { EditWorklogDialog } from "@/components/EditWorklogDialog"
import { Button } from "@/components/ui/button"
import { formatDurationHuman } from "@/lib/utils"
import { useIssueWorklogs } from "@/services/jira.hooks"
import type { JiraWorklog } from "@/types/bindings"

interface WorklogHistoryProps {
  issueKey: string
}

export function WorklogHistory({ issueKey }: WorklogHistoryProps) {
  const { t } = useTranslation()
  const { data, isLoading, error, refetch, isFetching } = useIssueWorklogs(issueKey)
  const [editingWorklog, setEditingWorklog] = useState<JiraWorklog | null>(null)

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        {t("Loading worklogs...")}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        {t("Failed to load worklogs: {{error}}", { error: error.message })}
      </div>
    )
  }

  if (!data || data.worklogs.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">{t("No worklogs yet.")}</div>
    )
  }

  // Sort worklogs by started date, most recent first
  const sortedWorklogs = [...data.worklogs].sort((a, b) => {
    return new Date(b.started).getTime() - new Date(a.started).getTime()
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold">
          {t("Work Log History ({{count}})", { count: data.worklogs.length })}
        </h4>
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
      <div className="space-y-2">
        {sortedWorklogs.map((worklog) => (
          <div
            key={worklog.id}
            className="text-sm border rounded-md p-4 bg-card hover:bg-accent/50 transition-colors group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium">{worklog.author?.displayName || t("Unknown")}</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  {new Date(worklog.started).toLocaleString()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingWorklog(worklog)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t("Edit worklog")}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-base">
                {formatDurationHuman(worklog.timeSpentSeconds)}
              </span>
            </div>
            {worklog.comment && (
              <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap border-t pt-2">
                {worklog.comment}
              </div>
            )}
          </div>
        ))}
      </div>

      <EditWorklogDialog
        isOpen={!!editingWorklog}
        issueKey={issueKey}
        worklog={editingWorklog}
        onClose={() => setEditingWorklog(null)}
        onSuccess={() => {
          setEditingWorklog(null)
          refetch()
        }}
      />
    </div>
  )
}
