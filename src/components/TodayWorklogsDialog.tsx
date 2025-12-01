import { useQuery, useQueryClient } from "@tanstack/react-query"
import { openUrl } from "@tauri-apps/plugin-opener"
import { format } from "date-fns"
import { ExternalLink, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { configService } from "@/services/jira"
import { useTodaysWorklogs } from "@/services/jira.hooks"
import { jiraKeys } from "@/services/jira.keys"
import type { JiraSettings } from "@/types/bindings"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { Skeleton } from "./ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

interface TodayWorklogsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TodayWorklogsDialog({ open, onOpenChange }: TodayWorklogsDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data, isLoading, isFetching } = useTodaysWorklogs()
  const { data: config } = useQuery<JiraSettings | null>({
    queryKey: jiraKeys.config(),
    queryFn: () => configService.get(),
  })

  const worklogs = data?.entries ?? []
  const totalSeconds = data?.totalTimeSeconds ?? 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const totalTime = `${hours}h ${minutes}m`

  const openIssue = async (key: string) => {
    if (config?.instanceUrl) {
      const url = config.instanceUrl.endsWith("/") ? config.instanceUrl : `${config.instanceUrl}/`
      await openUrl(`${url}browse/${key}`)
    }
  }

  const handleRefresh = () => {
    const today = format(new Date(), "yyyy-MM-dd")
    queryClient.invalidateQueries({ queryKey: jiraKeys.userWorklogs(today, today) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {t("Worklogs for {{date}}", { date: format(new Date(), "PP") })}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="mr-6"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <DialogDescription>
            {t("Total Time Tracked")}:{" "}
            <span className="font-bold text-foreground">{totalTime}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Issue")}</TableHead>
                  <TableHead>{t("Summary")}</TableHead>
                  <TableHead>{t("Time")}</TableHead>
                  <TableHead className="text-right">{t("Started")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worklogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t("No worklogs found for this day.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  worklogs.map((entry) => (
                    <TableRow key={entry.worklog.id}>
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-mono"
                          onClick={() => openIssue(entry.issueKey)}
                        >
                          {entry.issueKey} <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate" title={entry.issueSummary}>
                        {entry.issueSummary}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.worklog.timeSpent}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(new Date(entry.worklog.started), "HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
