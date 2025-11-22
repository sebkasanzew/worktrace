import { format } from "date-fns"
import { Calendar as CalendarIcon, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, formatDurationHuman, formatJiraStarted, parseDuration } from "@/lib/utils"

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
  onDelete?: () => void
}

const typePrefix: Record<WorkType, string> = {
  Development: "(D)",
  Concept: "(C)",
  Testing: "(T)",
}

export function WorklogDialog({
  isOpen,
  issueKey,
  initialSeconds,
  onCancel,
  onSubmit,
  onDelete,
}: Props) {
  const [timeInput, setTimeInput] = useState("")
  const [comment, setComment] = useState("")
  const [workType, setWorkType] = useState<WorkType>("Development")
  const [startedDate, setStartedDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeInput(initialSeconds > 0 ? formatDurationHuman(initialSeconds) : "")
      setComment("")
      setWorkType("Development")
      setStartedDate(new Date())
      setShowDeleteConfirm(false)
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
    const payload: WorklogForm = {
      timeSpentSeconds: seconds,
      comment: `${typePrefix[workType]} ${comment}`.trim(),
      started: formatJiraStarted(startedDate),
    }
    onSubmit(payload)
  }

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    onDelete?.()
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md max-h-screen overflow-y-auto">
        <CardHeader>
          <CardTitle>Log Work for {issueKey}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Started</span>
              <div className="flex gap-2">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startedDate ? format(startedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startedDate}
                      onSelect={(date) => {
                        if (date) {
                          setStartedDate((prev) => {
                            const newDate = new Date(date)
                            newDate.setHours(prev.getHours(), prev.getMinutes())
                            return newDate
                          })
                          setIsCalendarOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  className="w-[120px]"
                  value={format(startedDate, "HH:mm")}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(":").map(Number)
                    setStartedDate((prev) => {
                      const newDate = new Date(prev)
                      newDate.setHours(hours, minutes)
                      return newDate
                    })
                  }}
                />
              </div>
            </div>

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

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!!timeError} className="flex-1">
                  Submit
                </Button>
              </div>
              {onDelete && (
                <Button variant="destructive" onClick={handleDelete} className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {showDeleteConfirm ? "Click again to confirm delete" : "Delete & Stop Timer"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
