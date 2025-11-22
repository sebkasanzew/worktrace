import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Work for {issueKey}</DialogTitle>
        </DialogHeader>
        <WorklogForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          submitLabel="Submit"
          showDelete={!!onDelete}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  )
}
