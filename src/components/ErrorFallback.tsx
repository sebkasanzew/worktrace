import { error as logError } from "@tauri-apps/plugin-log"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import type { FallbackProps } from "react-error-boundary"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type UpdateInfo, updaterService } from "@/services/updater"
import packageJson from "../../package.json"

/**
 * Error fallback component displayed when the app crashes.
 * Shows app version and allows checking for updates to potentially fix the issue.
 */
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation()
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(0)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Log error on mount
  useEffect(() => {
    logError(`App crashed: ${error?.message || String(error)}`)
    if (error?.stack) {
      logError(`Stack trace: ${error.stack}`)
    }
  }, [error])

  const checkForUpdates = async () => {
    setChecking(true)
    setUpdateError(null)
    try {
      const info = await updaterService.checkForUpdates()
      setUpdateInfo(info)
      if (!info.available) {
        setUpdateError(t("You're running the latest version."))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setUpdateError(t("Failed to check for updates: {{error}}", { error: message }))
    }
    setChecking(false)
  }

  const installUpdate = async () => {
    setInstalling(true)
    setUpdateError(null)
    try {
      await updaterService.installUpdate((progress) => {
        setInstallProgress(progress)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setUpdateError(t("Failed to install update: {{error}}", { error: message }))
      setInstalling(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{t("Something went wrong")}</CardTitle>
          <CardDescription>
            {t("The app encountered an unexpected error. Please try reloading or updating.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium text-destructive">{error?.message || String(error)}</p>
          </div>

          {/* Version info */}
          <div className="text-center text-sm text-muted-foreground">
            {t("App Version")}: {packageJson.version}
          </div>

          {/* Update status */}
          {updateError && (
            <div className="text-sm text-center text-muted-foreground">{updateError}</div>
          )}

          {updateInfo?.available && (
            <div className="rounded-md bg-primary/10 p-3 text-sm text-center">
              <p className="font-medium">
                {t("Update available: v{{version}}", { version: updateInfo.version })}
              </p>
            </div>
          )}

          {/* Download progress */}
          {installing && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground text-center">
                {t("Downloading update... {{progress}}%", {
                  progress: installProgress.toFixed(0),
                })}
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${installProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {updateInfo?.available ? (
              <Button onClick={installUpdate} disabled={installing} className="w-full">
                {installing ? t("Installing...") : t("Install Update")}
              </Button>
            ) : (
              <Button
                onClick={checkForUpdates}
                disabled={checking || installing}
                className="w-full"
              >
                {checking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {t("Checking...")}
                  </>
                ) : (
                  t("Check for Updates")
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={resetErrorBoundary}
              disabled={installing}
              className="w-full"
            >
              {t("Try Again")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
