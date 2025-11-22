import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDurationHuman, formatJiraStarted, parseDuration } from "@/lib/utils"

type WorkType = "Development" | "Concept" | "Testing"

export interface WorklogForm {
  timeSpentSeconds: number
  comment: string
  started: string // formatted for JIRA
}

interface Props {
  isOpen: boolean
  issueKey: string
  initialSeconds: number
  onCancel: () => void
  onSubmit: (data: WorklogForm) => void
}

const typePrefix: Record<WorkType, string> = {
  Development: "(D)",
  Concept: "(C)",
  Testing: "(T)",
}

export function WorklogDialog({ isOpen, issueKey, initialSeconds, onCancel, onSubmit }: Props) {
  const [timeInput, setTimeInput] = useState("")
  const [comment, setComment] = useState("")
  const [workType, setWorkType] = useState<WorkType>("Development")

  useEffect(() => {
    if (isOpen) {
      const formatted = formatDurationHuman(initialSeconds)
      setTimeInput(formatted === "0m" ? "" : formatted)
      setComment("")
      setWorkType("Development")
    }
  }, [isOpen, initialSeconds])

  const timeError = useMemo(() => {
    const seconds = parseDuration(timeInput)
    return seconds <= 0 ? "Enter a valid duration" : ""
  }, [timeInput])

  if (!isOpen) return null

  const handleSubmit = () => {
    const seconds = parseDuration(timeInput)
    if (seconds <= 0) return
    const started = new Date(Date.now() - seconds * 1000)
    const payload: WorklogForm = {
      timeSpentSeconds: seconds,
      comment: `${typePrefix[workType]} ${comment}`.trim(),
      started: formatJiraStarted(started),
    }
    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log Work for {issueKey}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="wl-time">
                Time Tracked
              </label>
              <input
                id="wl-time"
                className="border rounded-md px-3 py-2 bg-background"
                placeholder="e.g. 1h 30m"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
              />
              {timeError && <p className="text-xs text-destructive">{timeError}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="wl-type">
                Work Type
              </label>
              <select
                id="wl-type"
                className="border rounded-md px-3 py-2 bg-background"
                value={workType}
                onChange={(e) => setWorkType(e.target.value as WorkType)}
              >
                <option value="Development">Development</option>
                <option value="Concept">Concept</option>
                <option value="Testing">Testing</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="wl-comment">
                Comment
              </label>
              <textarea
                id="wl-comment"
                className="border rounded-md px-3 py-2 bg-background min-h-24"
                placeholder="What did you do?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!!timeError}>
                Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
