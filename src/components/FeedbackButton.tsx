import { openUrl } from "@tauri-apps/plugin-opener"
import { MessageSquarePlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function FeedbackButton() {
  const { t } = useTranslation()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title={t("Bug Report & Feature Request")}>
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{t("Bug Report & Feature Request")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("Found a bug or have a feature request? Please report it on our GitHub issues.")}
            </p>
          </div>
          <Button
            onClick={() => openUrl("https://github.com/sebkasanzew/worktrace/issues")}
            className="w-full"
          >
            {t("Open GitHub Issues")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
