import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDurationHuman, formatJiraStarted, parseDuration } from "@/lib/utils"
import { useAppSettings } from "@/services/settings.hooks"
import { WorklogForm, type WorklogFormData } from "./WorklogForm"

export interface WorklogFormResult {
  timeSpentSeconds: number
  comment: string
  started: string // formatted for JIRA
}

interface Props {
  isOpen: boolean
  issueKey: string
  initialSeconds: number
  onCancel: () => void
  onSubmit: (data: WorklogFormResult) => void
  onDelete?: () => void
}

export function WorklogDialog({
  isOpen,
  issueKey,
  initialSeconds,
  onCancel,
  onSubmit,
  onDelete,
}: Props) {
  const { data: settings } = useAppSettings()

  if (!isOpen) return null

  const handleSubmit = (data: WorklogFormData) => {
    const { timeSpent, comment, workType, started } = data
    const seconds = parseDuration(timeSpent)
    if (seconds <= 0) return

    const selectedType = settings?.worklogTypes.find((t) => t.name === workType)
    const prefix = selectedType?.shortCode ? `${selectedType.shortCode}` : ""
    const fullComment = `${prefix} ${comment}`.trim()

    const payload: WorklogFormResult = {
      timeSpentSeconds: seconds,
      comment: fullComment,
      started: formatJiraStarted(started),
    }
    onSubmit(payload)
  }

  const initialValues: WorklogFormData = {
    timeSpent: initialSeconds > 0 ? formatDurationHuman(initialSeconds) : "",
    comment: settings?.defaultWorklogDescription || "",
    workType: settings?.worklogTypes?.[0]?.name || "",
    started: new Date(),
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md max-h-screen overflow-y-auto">
        <CardHeader>
          <CardTitle>Log Work for {issueKey}</CardTitle>
        </CardHeader>
        <CardContent>
          <WorklogForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            submitLabel="Submit"
            showDelete={!!onDelete}
            onDelete={onDelete}
          />
        </CardContent>
      </Card>
    </div>
  )
}
