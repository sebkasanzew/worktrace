import { useQuery, useQueryClient } from "@tanstack/react-query"
import { info, info as logInfo } from "@tauri-apps/plugin-log"
import { openUrl } from "@tauri-apps/plugin-opener"
import { ChevronDown, ExternalLink, LogOut, Play, RefreshCw, Settings, Square } from "lucide-react"
import { useRef, useState } from "react"
import { CustomIssuesDialog } from "@/components/CustomIssuesDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ViewHeader } from "@/components/ViewHeader"
import { WorklogDialog } from "@/components/WorklogDialog"
import { WorklogHistory } from "@/components/WorklogHistory"
import { formatDuration } from "@/lib/utils"
import { configService } from "@/services/jira"
import { useAddWorklog, useIssuesByJql, useMyIssues } from "@/services/jira.hooks"
import { jiraKeys } from "@/services/jira.keys"
import { useAppSettings } from "@/services/settings.hooks"
import { useTimeTracker } from "@/services/time-tracker.hooks"
import type { JiraConfig } from "@/types/jira"

interface TaskListProps {
  onLogout: () => void
  onOpenSettings: () => void
}

export function TaskList({ onLogout, onOpenSettings }: TaskListProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [customIssuesDialogOpen, setCustomIssuesDialogOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<"assigned" | "all">("assigned")
  const customIssuesChangedRef = useRef(false)
  const queryClient = useQueryClient()

  const { data: config } = useQuery<JiraConfig>({
    queryKey: jiraKeys.config(),
    queryFn: () => configService.get(),
  })

  const { data: settings } = useAppSettings()
  const customIssueKeys = settings?.customIssueKeys || []
  const customIssuesJql = customIssueKeys.length > 0 ? `key in (${customIssueKeys.join(",")})` : ""

  const { data: customIssues } = useIssuesByJql(customIssuesJql)

  const { data: issues, isLoading, error, refetch, isFetching } = useMyIssues()

  const displayedIssues =
    filterMode === "all" && customIssues?.issues
      ? [
          ...(issues?.issues || []),
          ...customIssues.issues.filter((i) => !issues?.issues.some((my) => my.key === i.key)),
        ]
      : issues?.issues || []

  const {
    activeIssueKey,
    dialogOpen,
    elapsedMs,
    getElapsedFor,
    requestStart,
    stopAndOpenDialog,
    resume,
    clearAfterLogged,
  } = useTimeTracker()
  const addWorklog = useAddWorklog()

  const handleCustomIssuesOpenChange = (open: boolean) => {
    if (open) {
      customIssuesChangedRef.current = false
    } else {
      if (customIssuesChangedRef.current) {
        setFilterMode("all")
      }
    }
    setCustomIssuesDialogOpen(open)
  }

  const handleIssuesChanged = () => {
    customIssuesChangedRef.current = true
  }

  const handleRefresh = async () => {
    info("[TaskList] Manual refresh triggered")
    await refetch()
  }

  const handleLogout = async () => {
    await configService.clear()
    onLogout()
  }

  const toggleExpand = (issueKey: string) => {
    setExpandedIssue(expandedIssue === issueKey ? null : issueKey)
  }

  const openJiraIssue = async (e: React.MouseEvent, issueKey: string) => {
    e.stopPropagation()
    if (config?.url) {
      const url = config.url.endsWith("/") ? config.url : `${config.url}/`
      await openUrl(`${url}browse/${issueKey}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with drag region for window controls */}
      <ViewHeader
        title="My JIRA Issues"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenSettings} aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </>
        }
      />

      {/* Scrollable Content */}
      <div className="max-w-4xl mx-auto p-6">
        {error && (
          <Card className="mb-4 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive font-medium mb-2">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
              <p className="text-sm text-muted-foreground">
                Check the developer console (View → Developer → Toggle Developer Tools) for more
                details.
              </p>
              {config && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <p>JIRA URL: {config.url}</p>
                  <p>Username: {config.username}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <p className="text-muted-foreground">Loading issues...</p>
          </div>
        )}

        {!isLoading && issues && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {displayedIssues.length} issues
                </div>
                <Select
                  value={filterMode}
                  onValueChange={(value: "assigned" | "all") => setFilterMode(value)}
                >
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue placeholder="Filter issues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assigned">Only assigned to me</SelectItem>
                    <SelectItem value="all">Assigned + Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCustomIssuesDialogOpen(true)}>
                More issues
              </Button>
            </div>
            <div className="space-y-4">
              {displayedIssues.map((issue) => (
                <Card
                  key={issue.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => toggleExpand(issue.key)}
                >
                  <CardContent className="p-6">
                    {/* Top Row: Key, Link, Status, Timer Button */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{issue.key}</span>
                        <button
                          type="button"
                          onClick={(e) => openJiraIssue(e, issue.key)}
                          className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Open in JIRA"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <div className="text-xs font-medium px-2.5 py-0.5 bg-blue-500 text-white rounded-full">
                          {issue.fields.status.name}
                        </div>
                      </div>
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Stop propagation for nested interactive elements */}
                      {/* biome-ignore lint/a11y/noStaticElementInteractions: Stop propagation for nested interactive elements */}
                      <div onClick={(e) => e.stopPropagation()}>
                        {activeIssueKey === issue.key ? (
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-mono text-muted-foreground min-w-16 text-right">
                              {formatDuration(Math.floor(getElapsedFor(issue.key) / 1000))}
                            </div>
                            <Button
                              size="sm"
                              onClick={stopAndOpenDialog}
                              aria-label={`Stop timer for ${issue.key}`}
                              className="bg-destructive hover:bg-destructive/90 text-white"
                            >
                              <Square className="h-4 w-4 mr-1" /> Stop
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => requestStart(issue.key)}
                            aria-label={`Start timer for ${issue.key}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Play className="h-4 w-4 mr-1" /> Start
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Second Row: Summary */}
                    <div className="mb-4">
                      <h3 className="font-medium text-base">{issue.fields.summary}</h3>
                    </div>

                    {/* Third Row: Progress Bar */}
                    <div className="mb-4">
                      {(() => {
                        const subtasks = issue.fields.subtasks || []
                        const total = subtasks.length
                        const completed = subtasks.filter((t) => {
                          // Use statusCategory if available (key is usually 'done')
                          if (t.fields.status.statusCategory?.key === "done") {
                            return true
                          }
                          // Fallback to name matching for older JIRA instances or if category is missing
                          const name = t.fields.status.name.toLowerCase()
                          return ["done", "closed", "resolved", "complete", "finished"].includes(
                            name
                          )
                        }).length
                        const progress = total > 0 ? Math.round((completed / total) * 100) : 0

                        return (
                          <>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>
                                {total > 0 ? `${completed}/${total} subtasks` : "No subtasks"}
                              </span>
                              <span>{progress}%</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    {/* Fourth Row: Assignee, Updated, Expand Indicator */}
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <div>
                        {issue.fields.assignee && (
                          <span>Assigned to: {issue.fields.assignee.displayName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div>Updated: {new Date(issue.fields.updated).toLocaleDateString()}</div>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform duration-200 ${
                            expandedIssue === issue.key ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedIssue === issue.key && (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: Stop propagation for nested interactive elements
                      // biome-ignore lint/a11y/noStaticElementInteractions: Stop propagation for nested interactive elements
                      <div
                        className="mt-6 pt-6 border-t cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <WorklogHistory issueKey={issue.key} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {(!issues.issues || issues.issues.length === 0) && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No unresolved issues assigned to you.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      {/* Worklog Dialog */}
      <WorklogDialog
        isOpen={dialogOpen}
        issueKey={activeIssueKey ?? ""}
        initialSeconds={Math.floor(elapsedMs / 1000)}
        onCancel={() => {
          logInfo("[TaskList] Worklog canceled, resuming timer")
          resume()
        }}
        onDelete={() => {
          logInfo("[TaskList] Worklog deleted, stopping timer")
          clearAfterLogged()
        }}
        onSubmit={({ timeSpentSeconds, comment, started }) => {
          if (!activeIssueKey) return
          logInfo(
            `[TaskList] Submitting worklog for ${activeIssueKey}: ${timeSpentSeconds}s, comment: "${comment}"`
          )
          addWorklog.mutate(
            { issueKey: activeIssueKey, payload: { timeSpentSeconds, comment, started } },
            {
              onSuccess: () => {
                clearAfterLogged()
                refetch()
                // Invalidate worklogs for this issue
                queryClient.invalidateQueries({ queryKey: jiraKeys.issueWorklogs(activeIssueKey) })
              },
            }
          )
        }}
      />
      <CustomIssuesDialog
        open={customIssuesDialogOpen}
        onOpenChange={handleCustomIssuesOpenChange}
        onIssuesChanged={handleIssuesChanged}
      />
    </div>
  )
}
