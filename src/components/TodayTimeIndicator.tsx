import { Clock } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useTodaysWorklogs } from "@/services/jira.hooks"
import { TodayWorklogsDialog } from "./TodayWorklogsDialog"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Skeleton } from "./ui/skeleton"

export function TodayTimeIndicator() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useTodaysWorklogs()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (isLoading) {
    return <Skeleton className="h-9 w-24" />
  }

  if (isError || !data) {
    return null
  }

  const totalSeconds = data.totalTimeSeconds
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const timeString = `${hours}h ${minutes}m`

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsDialogOpen(true)}
      >
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">{t("Today: {{time}}", { time: timeString })}</span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {data.entries.length}
        </Badge>
      </Button>

      <TodayWorklogsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}
