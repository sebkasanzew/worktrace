import {
  differenceInCalendarWeeks,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { de, enUS } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import type { ToolbarProps } from "react-big-calendar"
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar"
import { useTranslation } from "react-i18next"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { ViewHeader } from "@/components/ViewHeader"
import { cn } from "@/lib/utils"
import { useUserWorklogsByDateRange } from "@/services/jira.hooks"
import type { UserWorklogEntry } from "@/types/bindings"
import { DayWorklogsDialog } from "./DayWorklogsDialog"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"

const locales = {
  "en-US": enUS,
  en: enUS,
  de: de,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
})

interface WorklogEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: {
    seconds: number
    entries: UserWorklogEntry[]
  }
}

function CustomToolbar({ label, onNavigate }: ToolbarProps<WorklogEvent, object>) {
  const { t } = useTranslation()

  return (
    <div className="rbc-toolbar flex items-center justify-between gap-2">
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          className="flex! rounded-e-none! border-e-0! m-0!"
          onClick={() => onNavigate("TODAY")}
        >
          {t("Today")}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 flex! rounded-none! border-e-0! px-0! py-0!"
          onClick={() => onNavigate("PREV")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 flex! rounded-s-none! px-0! py-0!"
          onClick={() => onNavigate("NEXT")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="rbc-toolbar-label">{label}</span>
    </div>
  )
}

export function WorklogCalendar({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Calculate the date range for the current month view (with padding for visible weeks)
  const dateRange = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    // Add padding for weeks that span months
    const start = new Date(monthStart)
    start.setDate(start.getDate() - 7)
    const end = new Date(monthEnd)
    end.setDate(end.getDate() + 7)
    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    }
  }, [currentDate])

  const { data, isLoading, error } = useUserWorklogsByDateRange(dateRange.start, dateRange.end)

  // Group worklogs by date and convert to events
  const events = useMemo<WorklogEvent[]>(() => {
    if (!data?.entries) return []

    const worklogsByDate = data.entries.reduce(
      (acc, entry) => {
        const dateStr = entry.worklog.started.split("T")[0]
        if (!acc[dateStr]) {
          acc[dateStr] = { seconds: 0, entries: [] }
        }
        acc[dateStr].seconds += entry.worklog.timeSpentSeconds
        acc[dateStr].entries.push(entry)
        return acc
      },
      {} as Record<string, { seconds: number; entries: UserWorklogEntry[] }>
    )

    return Object.entries(worklogsByDate).map(([dateStr, dayData]) => {
      const date = new Date(dateStr)
      const hours = Math.floor(dayData.seconds / 3600)
      const minutes = Math.floor((dayData.seconds % 3600) / 60)
      return {
        id: dateStr,
        title: `${hours}h ${minutes}m`,
        start: date,
        end: date,
        allDay: true,
        resource: dayData,
      }
    })
  }, [data])

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedDate(start)
    setIsDialogOpen(true)
  }, [])

  const handleSelectEvent = useCallback((event: WorklogEvent) => {
    setSelectedDate(event.start)
    setIsDialogOpen(true)
  }, [])

  // Custom event styling
  const eventPropGetter = useCallback(() => {
    return {
      className:
        "!bg-primary !text-primary-foreground !rounded-sm !text-[10px] !font-bold !border-0",
      style: {
        backgroundColor: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        borderRadius: "2px",
        fontSize: "10px",
        fontWeight: "bold",
        border: "none",
        padding: "1px 4px",
      },
    }
  }, [])

  // Custom day cell styling
  const dayPropGetter = useCallback((date: Date) => {
    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
    return {
      className: cn(isToday && "!bg-accent/30"),
      style: isToday ? { backgroundColor: "hsl(var(--accent) / 0.3)" } : {},
    }
  }, [])

  const components = useMemo(
    () => ({
      toolbar: CustomToolbar,
      month: {
        dateHeader: ({ label }: { label: string }) => (
          <div className="flex items-center gap-1">
            <span>{label}</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
        ),
      },
    }),
    [isLoading]
  )

  // Get current locale
  const culture = i18n.language.startsWith("de") ? "de" : "en-US"

  // Calculate the height based on the number of weeks displayed
  const calendarHeight = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    const weeks = differenceInCalendarWeeks(end, start, { weekStartsOn: 1 }) + 1
    return weeks > 5 ? 500 : 420
  }, [currentDate])

  return (
    <div className="min-h-screen bg-background">
      <ViewHeader
        title={t("Worklog Calendar")}
        actions={
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("Close")}
          </Button>
        }
      />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error.message}
              </div>
            )}

            <Calendar
              className="font-[inherit]! [&_.rbc-toolbar]:mb-4! [&_.rbc-toolbar]:flex-nowrap! [&_.rbc-toolbar_button]:text-foreground! [&_.rbc-toolbar_button]:border-border! [&_.rbc-toolbar_button]:bg-transparent! [&_.rbc-toolbar_button]:text-sm! [&_.rbc-toolbar_button:hover]:bg-accent! [&_.rbc-toolbar_button:hover]:text-accent-foreground! [&_.rbc-toolbar_button:hover]:border-border! [&_.rbc-toolbar_button:active]:bg-accent! [&_.rbc-toolbar_button:active]:text-accent-foreground! [&_.rbc-toolbar_button:active]:border-border! [&_.rbc-toolbar_button:active]:shadow-none! [&_.rbc-toolbar_button.rbc-active]:bg-accent! [&_.rbc-toolbar_button.rbc-active]:text-accent-foreground! [&_.rbc-toolbar_button.rbc-active]:border-border! [&_.rbc-toolbar_button.rbc-active]:shadow-none! [&_.rbc-toolbar-label]:font-semibold! [&_.rbc-toolbar-label]:text-xl! [&_.rbc-header]:py-2! [&_.rbc-header]:font-medium! [&_.rbc-header]:text-muted-foreground! [&_.rbc-header]:uppercase! [&_.rbc-header]:text-xs! [&_.rbc-header]:tracking-wider! [&_.rbc-day-bg]:transition-colors! [&_.rbc-day-bg]:duration-200! [&_.rbc-day-bg]:cursor-pointer! [&_.rbc-day-bg:hover]:bg-accent/50! [&_.rbc-off-range-bg]:bg-muted/30! [&_.rbc-off-range]:text-muted-foreground/40! [&_.rbc-off-range_>_a]:text-muted-foreground/40! [&_.rbc-today]:bg-accent/30! [&_.rbc-date-cell]:p-2! [&_.rbc-date-cell]:text-start! [&_.rbc-date-cell]:cursor-pointer! [&_.rbc-date-cell_>_a]:text-sm! [&_.rbc-date-cell_>_a]:font-medium! [&_.rbc-date-cell_>_a]:text-muted-foreground! [&_.rbc-now_>_a]:text-foreground! [&_.rbc-row-segment]:px-2! [&_.rbc-row-segment]:pb-1! [&_.rbc-row-bg]:end-0! [&_.rbc-event]:px-1.5! [&_.rbc-event]:py-0.5! [&_.rbc-show-more]:text-primary! [&_.rbc-show-more]:text-xs! [&_.rbc-btn-group:last-child]:hidden! [&_.rbc-header]:border-b-muted-foreground/30! [&_.rbc-header]:border-b! [&_.rbc-header+.rbc-header]:border-s-muted-foreground/30! [&_.rbc-header+.rbc-header]:border-s! [&_.rbc-month-view]:border-muted-foreground/30! [&_.rbc-month-view]:border! [&_.rbc-month-view]:rounded-md! [&_.rbc-month-view]:overflow-hidden! [&_.rbc-day-bg+.rbc-day-bg]:border-s-muted-foreground/30! [&_.rbc-day-bg+.rbc-day-bg]:border-s! [&_.rbc-month-row+.rbc-month-row]:border-t-muted-foreground/30! [&_.rbc-month-row+.rbc-month-row]:border-t!"
              localizer={localizer}
              culture={culture}
              events={events}
              date={currentDate}
              onNavigate={handleNavigate}
              view="month"
              views={["month"] as View[]}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventPropGetter}
              dayPropGetter={dayPropGetter}
              components={components}
              style={{ height: calendarHeight }}
            />
          </CardContent>
        </Card>
      </div>

      {selectedDate && (
        <DayWorklogsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} date={selectedDate} />
      )}
    </div>
  )
}
