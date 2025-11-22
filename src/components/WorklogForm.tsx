import { format } from "date-fns"
import { Calendar as CalendarIcon, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, parseDuration } from "@/lib/utils"
import { useAppSettings } from "@/services/settings.hooks"

export interface WorklogFormData {
  timeSpent: string
  comment: string
  workType: string
  started: Date
}

interface WorklogFormProps {
  initialValues: WorklogFormData
  onSubmit: (data: WorklogFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
  showDelete?: boolean
  onDelete?: () => void
  isDeleting?: boolean
}

export function WorklogForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Submit",
  showDelete = false,
  onDelete,
  isDeleting = false,
}: WorklogFormProps) {
  const { data: settings } = useAppSettings()

  const [timeInput, setTimeInput] = useState(initialValues.timeSpent)
  const [comment, setComment] = useState(initialValues.comment)
  const [workType, setWorkType] = useState(initialValues.workType)
  const [startedDate, setStartedDate] = useState<Date>(initialValues.started)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset form when initialValues change
  useEffect(() => {
    setTimeInput(initialValues.timeSpent)
    setComment(initialValues.comment)
    setWorkType(initialValues.workType)
    setStartedDate(initialValues.started)
    setShowDeleteConfirm(false)
  }, [initialValues])

  const timeError = useMemo(() => {
    const seconds = parseDuration(timeInput)
    return seconds <= 0 ? "Enter a valid duration" : ""
  }, [timeInput])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (parseDuration(timeInput) <= 0) return

    onSubmit({
      timeSpent: timeInput,
      comment,
      workType,
      started: startedDate,
    })
  }

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    onDelete?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <Input
            id="wl-time"
            placeholder="e.g. 1h 30m"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
          {timeError && <p className="text-xs text-destructive">{timeError}</p>}
          <p className="text-xs text-muted-foreground">Format: 2h 30m, 1.5h, 90m</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="wl-type">
            Work Type
          </label>
          <select
            id="wl-type"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
          >
            {settings?.worklogTypes?.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}{" "}
                {t.shortCode.startsWith("(") && t.shortCode.endsWith(")")
                  ? t.shortCode
                  : `(${t.shortCode})`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="wl-comment">
            Comment
          </label>
          <textarea
            id="wl-comment"
            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Add a comment (optional)"
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!!timeError || isSubmitting} className="flex-1">
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </div>
          {showDelete && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="w-full"
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting
                ? "Deleting..."
                : showDeleteConfirm
                  ? "Click again to confirm delete"
                  : "Delete Worklog"}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
