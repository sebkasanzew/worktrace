import { Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatDurationHuman, parseDuration } from "@/lib/utils"
import { useDeleteWorklog, useUpdateWorklog } from "@/services/jira.hooks"
import type { JiraWorklog } from "@/types/bindings"

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
  const [timeInput, setTimeInput] = useState("")
  const [comment, setComment] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const updateMutation = useUpdateWorklog()
  const deleteMutation = useDeleteWorklog()

  // Update form fields when worklog changes
  useEffect(() => {
    if (worklog && isOpen) {
      setTimeInput(formatDurationHuman(worklog.timeSpentSeconds))
      setComment(worklog.comment || "")
      setShowDeleteConfirm(false)
    }
  }, [worklog, isOpen])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!worklog) return

    const timeSpentSeconds = parseDuration(timeInput)
    if (timeSpentSeconds === 0) {
      alert("Please enter a valid time duration (e.g., 1h 30m)")
      return
    }

    updateMutation.mutate(
      {
        issueKey,
        worklogId: worklog.id,
        timeSpentSeconds,
        comment,
        started: worklog.started,
      },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (error: Error) => {
          console.error("Failed to update worklog:", error)
          alert(`Failed to update worklog: ${error.message}`)
        },
      }
    )
  }

  const handleDelete = async () => {
    if (!worklog || !showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

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
          alert(`Failed to delete worklog: ${error.message}`)
        },
      }
    )
  }

  if (!worklog) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Worklog</DialogTitle>
          <DialogDescription>
            Modify the time spent and comment for this worklog entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="time" className="text-sm font-medium">
                Time Spent
              </label>
              <Input
                id="time"
                type="text"
                placeholder="e.g., 2h 30m or 1:30"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Format: 2h 30m, 1.5h, 90m, or 1:30 (mm:ss)
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="comment" className="text-sm font-medium">
                Comment
              </label>
              <Input
                id="comment"
                type="text"
                placeholder="What did you work on?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-col gap-2 sm:gap-2">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMutation.isPending
                ? "Deleting..."
                : showDeleteConfirm
                  ? "Click again to confirm delete"
                  : "Delete Worklog"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
