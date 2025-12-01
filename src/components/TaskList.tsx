import { useQuery, useQueryClient } from "@tanstack/react-query"
import { info, info as logInfo } from "@tauri-apps/plugin-log"
import { openUrl } from "@tauri-apps/plugin-opener"
import { format } from "date-fns"
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ExternalLink,
  LogOut,
  Minimize2,
  Play,
  RefreshCw,
  Settings,
  Square,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { CustomIssuesDialog } from "@/components/CustomIssuesDialog"
import { TodayTimeIndicator } from "@/components/TodayTimeIndicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ViewHeader } from "@/components/ViewHeader"
import { WorklogCalendar } from "@/components/WorklogCalendar"
import { WorklogDialog } from "@/components/WorklogDialog"
import { WorklogHistory } from "@/components/WorklogHistory"
import { formatDuration } from "@/lib/utils"
import { configService } from "@/services/jira"
import { useAddWorklog, useIssuesByJql, useMyIssues } from "@/services/jira.hooks"
import { jiraKeys } from "@/services/jira.keys"
import { useAppSettings } from "@/services/settings.hooks"
import type { useTimeTracker } from "@/services/time-tracker.hooks"
import type { JiraIssue, JiraSettings } from "@/types/bindings"

interface TaskListProps {
  onLogout: () => void
  onOpenSettings: () => void
  onEnterMiniMode: () => void
  timeTracker: ReturnType<typeof useTimeTracker>
}

export function TaskList({
  onLogout,
  onOpenSettings,
  onEnterMiniMode,
  timeTracker,
}: TaskListProps) {
  const { t } = useTranslation()
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [customIssuesDialogOpen, setCustomIssuesDialogOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [filters, setFilters] = useState({ assigned: true, custom: false })
  const customIssuesChangedRef = useRef(false)
  const queryClient = useQueryClient()

  const { data: config } = useQuery<JiraSettings | null>({
    queryKey: jiraKeys.config(),
    queryFn: () => configService.get(),
  })

  const { data: settings } = useAppSettings()
  const customIssueKeys = settings?.general.customIssueKeys || []
  const customIssuesJql = customIssueKeys.length > 0 ? `key in (${customIssueKeys.join(",")})` : ""

  const { data: customIssues } = useIssuesByJql(customIssuesJql)

  const { data: issues, isLoading, error, refetch, isFetching } = useMyIssues()

  const displayedIssues = useMemo(() => {
    const showAll = !filters.assigned && !filters.custom
    let result: JiraIssue[] = []

    if ((filters.assigned || showAll) && issues?.issues) {
      result = [...result, ...issues.issues]
    }
    if ((filters.custom || showAll) && customIssues?.issues) {
      const customToAdd = customIssues.issues.filter((i) => !result.some((r) => r.key === i.key))
      result = [...result, ...customToAdd]
    }

    // Filter out subtasks
    return result.filter((issue) => !issue.fields.issuetype?.subtask)
  }, [filters, issues, customIssues])

  const {
    activeIssueKey,
    dialogOpen,
    elapsedMs,
    getElapsedFor,
    requestStart,
    stopAndOpenDialog,
    resume,
    clearAfterLogged,
  } = timeTracker
  const addWorklog = useAddWorklog()

  const handleCustomIssuesOpenChange = (open: boolean) => {
    if (open) {
      customIssuesChangedRef.current = false
    } else {
      if (customIssuesChangedRef.current) {
        setFilters((prev) => ({ ...prev, custom: true }))
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
    if (config?.instanceUrl) {
      const url = config.instanceUrl.endsWith("/") ? config.instanceUrl : `${config.instanceUrl}/`
      await openUrl(`${url}browse/${issueKey}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with drag region for window controls */}
      <ViewHeader
        title={t("My JIRA Issues")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? t("Refreshing...") : t("Refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEnterMiniMode}
              aria-label={t("Mini Mode")}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenSettings} aria-label={t("Settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              {t("Logout")}
            </Button>
          </>
        }
      />

      {/* Scrollable Content */}
      <div className="max-w-4xl mx-auto p-6">
        {error && (
          <Card className="mb-4 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">{t("Error Loading Issues")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive font-medium mb-2">
                {error instanceof Error ? error.message : t("Unknown error")}
              </p>
              <p className="text-sm text-muted-foreground">
                Check the developer console (View → Developer → Toggle Developer Tools) for more
                details.
              </p>
              {config && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <p>
                    {t("JIRA URL")}: {config.instanceUrl}
                  </p>
                  <p>
                    {t("Username")}: {config.username}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <p className="text-muted-foreground">{t("Loading issues...")}</p>
          </div>
        )}

        {!isLoading && issues && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {t("Showing {{count}} issues", { count: displayedIssues.length })}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto min-h-8 w-auto min-w-[200px] justify-start p-1 font-normal"
                    >
                      <div className="flex flex-wrap gap-1">
                        {filters.assigned && (
                          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                            {t("Assigned")}
                          </Badge>
                        )}
                        {filters.custom && (
                          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                            {t("Custom")}
                          </Badge>
                        )}
                        {!filters.assigned && !filters.custom && (
                          <span className="text-muted-foreground px-2 text-sm">
                            {t("Filter issues")}
                          </span>
                        )}
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <div className="p-2 flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="assigned"
                          checked={filters.assigned}
                          onCheckedChange={(c) =>
                            setFilters((prev) => ({ ...prev, assigned: !!c }))
                          }
                        />
                        <label
                          htmlFor="assigned"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {t("Assigned to me")}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="custom"
                          checked={filters.custom}
                          onCheckedChange={(c) => setFilters((prev) => ({ ...prev, custom: !!c }))}
                        />
                        <label
                          htmlFor="custom"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {t("Custom issues")}
                        </label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <TodayTimeIndicator />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarOpen(true)}
                  aria-label={t("Worklog Calendar")}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCustomIssuesDialogOpen(true)}>
                  {t("More issues")}
                </Button>
              </div>
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
                          title={t("Open in JIRA")}
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
                              <Square className="h-4 w-4 mr-1" /> {t("Stop")}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => requestStart(issue.key)}
                            aria-label={`Start timer for ${issue.key}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Play className="h-4 w-4 mr-1" /> {t("Start")}
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
                                {total > 0
                                  ? `${completed}/${total} ${t("subtasks")}`
                                  : t("No subtasks")}
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
                          <span>
                            {t("Assigned to")}: {issue.fields.assignee.displayName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          {t("Updated")}: {new Date(issue.fields.updated).toLocaleDateString()}
                        </div>
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
                // Invalidate today's worklogs to update the indicator
                const today = format(new Date(), "yyyy-MM-dd")
                queryClient.invalidateQueries({ queryKey: jiraKeys.userWorklogs(today, today) })
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
      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <WorklogCalendar />
        </DialogContent>
      </Dialog>
    </div>
  )
}
