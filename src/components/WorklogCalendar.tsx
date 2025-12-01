import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import FullCalendar from "@fullcalendar/react"
import { format } from "date-fns"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useUserWorklogsByDateRange } from "@/services/jira.hooks"
import type { UserWorklogEntry } from "@/types/bindings"
import { DayWorklogsDialog } from "./DayWorklogsDialog"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export function WorklogCalendar() {
  const { t } = useTranslation()
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data } = useUserWorklogsByDateRange(dateRange.start, dateRange.end)

  // Group worklogs by date
  const worklogsByDate = data?.entries.reduce(
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const handleDatesSet = (arg: { startStr: string; endStr: string }) => {
    setDateRange({
      start: arg.startStr.split("T")[0],
      end: arg.endStr.split("T")[0],
    })
  }

  const handleDateClick = (arg: { date: Date }) => {
    setSelectedDate(arg.date)
    setIsDialogOpen(true)
  }

  return (
    <>
      <Card className="h-full border-0 shadow-none">
        <CardHeader className="p-4">
          <CardTitle>{t("Worklog Calendar")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <style>{`
            .fc {
              --fc-border-color: hsl(var(--border));
              --fc-button-bg-color: transparent;
              --fc-button-border-color: hsl(var(--border));
              --fc-button-text-color: hsl(var(--foreground));
              --fc-button-hover-bg-color: hsl(var(--accent));
              --fc-button-hover-border-color: hsl(var(--border));
              --fc-button-active-bg-color: hsl(var(--accent));
              --fc-button-active-border-color: hsl(var(--border));
              --fc-today-bg-color: hsl(var(--accent) / 0.3);
              --fc-page-bg-color: transparent;
              --fc-neutral-bg-color: hsl(var(--secondary));
              --fc-list-event-hover-bg-color: hsl(var(--secondary));
              font-family: inherit;
            }
            .fc-theme-standard .fc-scrollgrid {
              border: 1px solid hsl(var(--border));
              border-radius: var(--radius);
              overflow: hidden;
            }
            .fc-theme-standard td, .fc-theme-standard th {
              border-color: hsl(var(--border));
            }
            .fc .fc-daygrid-day-top {
              flex-direction: row;
              padding: 8px;
            }
            .fc-daygrid-day-events {
              display: none;
            }
            .fc-toolbar-title {
              font-size: 1.25rem !important;
              font-weight: 600;
            }
            .fc-toolbar.fc-header-toolbar {
              margin-bottom: 1.5rem !important;
              padding: 0 1rem !important;
            }
            .fc-button-group {
              gap: 0.5rem;
            }
            .fc-button {
              font-size: 0.875rem !important;
              font-weight: 500;
              text-transform: capitalize;
              border-radius: var(--radius) !important;
              padding: 0.5rem 1rem !important;
              height: auto !important;
              margin-left: 0 !important;
            }
            .fc-button:focus {
              box-shadow: none !important;
            }
            .fc-col-header-cell-cushion {
              padding: 12px 0;
              font-weight: 500;
              color: hsl(var(--muted-foreground));
              text-transform: uppercase;
              font-size: 0.75rem;
              letter-spacing: 0.05em;
            }
            .fc-daygrid-day {
              transition: background-color 0.2s;
              cursor: pointer;
            }
            .fc-daygrid-day:hover {
              background-color: hsl(var(--accent) / 0.5);
            }
            .fc-daygrid-day-frame {
              min-height: 100px;
            }
            /* Hide the month view button since it's the only view */
            .fc-dayGridMonth-button {
              display: none !important;
            }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "today",
            }}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            height="auto"
            dayCellContent={(arg) => {
              const dateStr = format(arg.date, "yyyy-MM-dd")
              const dayData = worklogsByDate?.[dateStr]

              return (
                <div className="flex flex-col items-start justify-between h-full w-full py-2 px-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {arg.dayNumberText}
                  </span>
                  {dayData && (
                    <div className="mt-1 w-full">
                      <span className="text-[10px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm block w-fit">
                        {formatTime(dayData.seconds)}
                      </span>
                    </div>
                  )}
                </div>
              )
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
