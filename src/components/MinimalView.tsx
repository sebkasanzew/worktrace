import { getCurrentWindow } from "@tauri-apps/api/window"
import { GripHorizontal, Maximize2, Square } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAppSettings, useSaveAppSettings } from "@/services/settings.hooks"
import type { useTimeTracker } from "@/services/time-tracker.hooks"

interface MinimalViewProps {
  onMaximize: () => void
  timeTracker: ReturnType<typeof useTimeTracker>
}

export function MinimalView({ onMaximize, timeTracker }: MinimalViewProps) {
  const { t } = useTranslation()
  const { activeIssueKey, elapsedMs, stopAndOpenDialog } = timeTracker
  const { data: settings } = useAppSettings()
  const saveMutation = useSaveAppSettings()

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const toggleAlwaysOnTop = (checked: boolean) => {
    if (settings) {
      saveMutation.mutate({
        ...settings,
        general: { ...settings.general, alwaysOnTop: checked },
      })
    }
  }

  const startDragging = async () => {
    try {
      await getCurrentWindow().startDragging()
    } catch (error) {
      console.error("Failed to start dragging:", error)
    }
  }

  return (
    <div className="h-full w-full bg-background flex flex-col select-none cursor-default rounded-lg overflow-hidden">
      {/* Drag Handle */}
      <button
        type="button"
        className="h-6 bg-muted/50 w-full flex items-center justify-center cursor-move hover:bg-muted/80 transition-colors border-none p-0 m-0"
        onMouseDown={startDragging}
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground/50 pointer-events-none" />
      </button>

      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium">
              {activeIssueKey || t("No active task")}
            </span>
            <span className="text-3xl font-bold tracking-tight font-mono">
              {formatTime(elapsedMs)}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onMaximize} className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="always-on-top"
              checked={settings?.general.alwaysOnTop ?? false}
              onCheckedChange={toggleAlwaysOnTop}
            />
            <label
              htmlFor="always-on-top"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("Always on Top")}
            </label>
          </div>

          {activeIssueKey && (
            <Button
              variant="destructive"
              size="sm"
              onClick={stopAndOpenDialog}
              className="h-8 px-3"
            >
              <Square className="h-3 w-3 mr-2 fill-current" />
              {t("Stop")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
