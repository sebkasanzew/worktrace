import { useMemo } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
  const { data: settings } = useAppSettings()

  const handleSubmit = (data: WorklogFormData) => {
    const { timeSpent, comment, workType, started } = data
    const seconds = parseDuration(timeSpent)
    if (seconds <= 0) return

    const selectedType = settings?.general.worklogTypes.find((t) => t.name === workType)
    const prefix = selectedType?.shortCode ? `${selectedType.shortCode}` : ""
    const fullComment = `${prefix} ${comment}`.trim()

    const payload: WorklogFormResult = {
      timeSpentSeconds: seconds,
      comment: fullComment,
      started: formatJiraStarted(started),
    }
    onSubmit(payload)
  }

  const initialValues: WorklogFormData = useMemo(() => {
    let seconds = initialSeconds
    const roundingStep = settings?.general.roundingStep || 0

    if (seconds > 0 && roundingStep > 0) {
      const minutes = seconds / 60
      const roundedMinutes = Math.ceil(minutes / roundingStep) * roundingStep
      seconds = roundedMinutes * 60
    }

    return {
      timeSpent: seconds > 0 ? formatDurationHuman(seconds) : "",
      comment: settings?.general.defaultWorklogDescription || "",
      workType: settings?.general.worklogTypes?.[0]?.name || "",
      started: new Date(),
    }
  }, [initialSeconds, settings])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Log Work for {{issueKey}}", { issueKey })}</DialogTitle>
        </DialogHeader>
        <WorklogForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          submitLabel={t("Submit")}
          showDelete={!!onDelete}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  )
}
