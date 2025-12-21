import { format } from "date-fns"
import { Calendar as CalendarIcon, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  submitLabel,
  showDelete = false,
  onDelete,
  isDeleting = false,
}: WorklogFormProps) {
  const { t } = useTranslation()
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
    return seconds <= 0 ? t("Enter a valid duration") : ""
  }, [timeInput, t])

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
          <span className="text-sm font-medium">{t("Started")}</span>
          <div className="flex gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-start font-normal",
                    !startedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {startedDate ? format(startedDate, "PPP") : <span>{t("Pick a date")}</span>}
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
            {t("Time Tracked")}
          </label>
          <Input
            id="wl-time"
            placeholder={t("e.g. 1h 30m")}
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
          {timeError && <p className="text-xs text-destructive">{timeError}</p>}
          <p className="text-xs text-muted-foreground">{t("Format: 2h 30m, 1.5h, 90m")}</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="wl-type">
            {t("Work Type")}
          </label>
          <Select value={workType} onValueChange={setWorkType}>
            <SelectTrigger id="wl-type">
              <SelectValue placeholder={t("Select work type")} />
            </SelectTrigger>
            <SelectContent>
              {settings?.general.worklogTypes?.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name}{" "}
                  {t.shortCode.startsWith("(") && t.shortCode.endsWith(")")
                    ? t.shortCode
                    : `(${t.shortCode})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="wl-comment">
            {t("Comment")}
          </label>
          <textarea
            id="wl-comment"
            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={t("Add a comment (optional)")}
            onChange={(e) => setComment(e.target.value)}
            value={comment}
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
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!!timeError || isSubmitting} className="flex-1">
              {isSubmitting ? t("Saving...") : submitLabel || t("Submit")}
            </Button>
          </div>
          {showDelete && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="w-full h-auto whitespace-normal text-center"
              disabled={isDeleting}
            >
              <Trash2 className="me-2 h-4 w-4 shrink-0" />
              {isDeleting
                ? t("Deleting...")
                : showDeleteConfirm
                  ? t("Click again to confirm delete")
                  : t("Delete Worklog")}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
