import { useQuery, useQueryClient } from "@tanstack/react-query"
import { info, info as logInfo } from "@tauri-apps/plugin-log"
import { ChevronDown, ChevronUp, LogOut, Play, RefreshCw, Square } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WorklogDialog } from "@/components/WorklogDialog"
import { WorklogHistory } from "@/components/WorklogHistory"
import { formatDuration } from "@/lib/utils"
import { configService } from "@/services/jira"
import { useAddWorklog, useMyIssues } from "@/services/jira.hooks"
import { jiraKeys } from "@/services/jira.keys"
import { useTimeTracker } from "@/services/time-tracker.hooks"
import type { JiraConfig } from "@/types/jira"

interface TaskListProps {
  onLogout: () => void
}

export function TaskList({ onLogout }: TaskListProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: config } = useQuery<JiraConfig>({
    queryKey: jiraKeys.config(),
    queryFn: () => configService.get(),
  })

  const { data: issues, isLoading, error, refetch, isFetching } = useMyIssues()
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

  const handleRefresh = async () => {
    info("[TaskList] Manual refresh triggered")
    await refetch()
  }

  const handleLogout = async () => {
    await configService.clear()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My JIRA Issues</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

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
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {issues.issues?.length || 0} issues
            </div>
            <div className="space-y-4">
              {issues.issues?.map((issue) => (
                <Card key={issue.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{issue.key}</CardTitle>
                        <CardDescription className="mt-1">{issue.fields.summary}</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        {activeIssueKey === issue.key ? (
                          <>
                            <div className="text-sm text-muted-foreground min-w-16 text-right">
                              {formatDuration(Math.floor(getElapsedFor(issue.key) / 1000))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={stopAndOpenDialog}
                              aria-label={`Stop timer for ${issue.key}`}
                            >
                              <Square className="h-4 w-4" /> Stop
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => requestStart(issue.key)}
                            aria-label={`Start timer for ${issue.key}`}
                          >
                            <Play className="h-4 w-4" /> Start
                          </Button>
                        )}
                        <div className="text-sm font-medium px-3 py-1 bg-secondary rounded-md">
                          {issue.fields.status.name}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <div>
                        {issue.fields.assignee && (
                          <span>Assigned to: {issue.fields.assignee.displayName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div>Updated: {new Date(issue.fields.updated).toLocaleDateString()}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedIssue(expandedIssue === issue.key ? null : issue.key)
                          }
                          className="h-7 px-2"
                        >
                          {expandedIssue === issue.key ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              <span className="ml-1">Hide History</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span className="ml-1">Show History</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  {expandedIssue === issue.key && <WorklogHistory issueKey={issue.key} />}
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
    </div>
  )
}
