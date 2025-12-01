import { format, getDay, parse, startOfWeek } from "date-fns"
import { de, enUS } from "date-fns/locale"
import { useCallback, useMemo, useState } from "react"
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar"
import { useTranslation } from "react-i18next"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { cn } from "@/lib/utils"
import { useUserWorklogsByDateRange } from "@/services/jira.hooks"
import type { UserWorklogEntry } from "@/types/bindings"
import { DayWorklogsDialog } from "./DayWorklogsDialog"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

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

export function SimpleCalendar() {
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

  const { data } = useUserWorklogsByDateRange(dateRange.start, dateRange.end)

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

  // Get current locale
  const culture = i18n.language.startsWith("de") ? "de" : "en-US"

  return (
    <>
      <Card className="h-full border-0 shadow-none">
        <CardHeader className="p-4">
          <CardTitle>{t("Worklog Calendar")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <style>{`
            .rbc-calendar {
              font-family: inherit;
            }
            .rbc-toolbar {
              margin-bottom: 1rem;
              flex-wrap: nowrap;
            }
            .rbc-toolbar button {
              color: hsl(var(--foreground));
              border-color: hsl(var(--border));
              background: transparent;
              border-radius: var(--radius);
              font-size: 0.875rem;
              padding: 0.5rem 1rem;
            }
            .rbc-toolbar button:hover {
              background: hsl(var(--accent));
              border-color: hsl(var(--border));
            }
            .rbc-toolbar button:active,
            .rbc-toolbar button.rbc-active {
              background: hsl(var(--accent));
              border-color: hsl(var(--border));
              box-shadow: none;
            }
            .rbc-toolbar-label {
              font-weight: 600;
              font-size: 1.25rem;
            }
            .rbc-header {
              padding: 12px 0;
              font-weight: 500;
              color: hsl(var(--muted-foreground));
              text-transform: uppercase;
              font-size: 0.75rem;
              letter-spacing: 0.05em;
              border-color: hsl(var(--border));
            }
            .rbc-month-view {
              border-color: hsl(var(--border));
              border-radius: var(--radius);
              overflow: hidden;
            }
            .rbc-day-bg {
              transition: background-color 0.2s;
            }
            .rbc-day-bg:hover {
              background-color: hsl(var(--accent) / 0.5);
            }
            .rbc-day-bg + .rbc-day-bg {
              border-color: hsl(var(--border));
            }
            .rbc-month-row + .rbc-month-row {
              border-color: hsl(var(--border));
            }
            .rbc-off-range-bg {
              background: hsl(var(--muted) / 0.3);
            }
            .rbc-today {
              background-color: hsl(var(--accent) / 0.3);
            }
            .rbc-date-cell {
              padding: 8px;
              text-align: left;
            }
            .rbc-date-cell > a {
              font-size: 0.875rem;
              font-weight: 500;
              color: hsl(var(--muted-foreground));
            }
            .rbc-now > a {
              color: hsl(var(--foreground));
            }
            .rbc-row-segment {
              padding: 0 8px 4px 8px;
            }
            .rbc-event {
              padding: 2px 6px !important;
            }
            .rbc-show-more {
              color: hsl(var(--primary));
              font-size: 0.75rem;
            }
            /* Hide week/day/agenda buttons - only month view */
            .rbc-btn-group:last-child {
              display: none;
            }
          `}</style>
          <Calendar
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
            style={{ height: 500 }}
            messages={{
              today: t("Today"),
              previous: "←",
              next: "→",
            }}
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <DayWorklogsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} date={selectedDate} />
      )}
    </>
  )
}
