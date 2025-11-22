import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDurationHuman, formatJiraStarted, parseDuration } from "@/lib/utils"
import { useDeleteWorklog, useUpdateWorklog } from "@/services/jira.hooks"
import { useAppSettings } from "@/services/settings.hooks"
import type { JiraWorklog } from "@/types/bindings"
import { WorklogForm, type WorklogFormData } from "./WorklogForm"

interface EditWorklogDialogProps {
  isOpen: boolean
  issueKey: string
  worklog: JiraWorklog | null
  onClose: () => void
  onSuccess: () => void
}

export function EditWorklogDialog({
  isOpen,
  issueKey,
  worklog,
  onClose,
  onSuccess,
}: EditWorklogDialogProps) {
  const { t } = useTranslation()
  const { data: settings } = useAppSettings()
  const [initialValues, setInitialValues] = useState<WorklogFormData | null>(null)

  const updateMutation = useUpdateWorklog()
  const deleteMutation = useDeleteWorklog()

  // Update form fields when worklog changes
  useEffect(() => {
    if (worklog && isOpen) {
      let currentComment = worklog.comment || ""
      let foundType = ""

      if (settings?.worklogTypes) {
        for (const type of settings.worklogTypes) {
          if (type.shortCode && currentComment.startsWith(type.shortCode)) {
            foundType = type.name
            currentComment = currentComment.substring(type.shortCode.length).trim()
            break
          }
        }
        if (!foundType && settings.worklogTypes.length > 0) {
          foundType = settings.worklogTypes[0].name
        }
      }

      setInitialValues({
        timeSpent: formatDurationHuman(worklog.timeSpentSeconds),
        comment: currentComment,
        workType: foundType,
        started: new Date(worklog.started),
      })
    }
  }, [worklog, isOpen, settings])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const handleSubmit = async (data: WorklogFormData) => {
    if (!worklog) return

    const { timeSpent, comment, workType, started } = data
    const timeSpentSeconds = parseDuration(timeSpent)
    if (timeSpentSeconds === 0) {
      alert(t("Please enter a valid time duration (e.g., 1h 30m)"))
      return
    }

    const selectedType = settings?.worklogTypes.find(
      (t: { name: string; shortCode: string }) => t.name === workType
    )
    const prefix = selectedType?.shortCode ? selectedType.shortCode : ""
    const fullComment = `${prefix} ${comment}`.trim()

    updateMutation.mutate(
      {
        issueKey,
        worklogId: worklog.id,
        timeSpentSeconds,
        comment: fullComment,
        started: formatJiraStarted(started),
      },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (error: Error) => {
          console.error("Failed to update worklog:", error)
          alert(t("Failed to update worklog: {{error}}", { error: error.message }))
        },
      }
    )
  }

  const handleDelete = async () => {
    if (!worklog) return

    deleteMutation.mutate(
      {
        issueKey,
        worklogId: worklog.id,
      },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (error: Error) => {
          console.error("Failed to delete worklog:", error)
          alert(t("Failed to delete worklog: {{error}}", { error: error.message }))
        },
      }
    )
  }

  if (!worklog || !initialValues) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Edit Worklog for {{issueKey}}", { issueKey })}</DialogTitle>
          <DialogDescription>
            {t("Modify the time spent and comment for this worklog entry.")}
          </DialogDescription>
        </DialogHeader>
        <WorklogForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel={t("Save Changes")}
          isSubmitting={updateMutation.isPending}
          showDelete={true}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
