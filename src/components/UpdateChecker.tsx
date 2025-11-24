import { message } from "@tauri-apps/plugin-dialog"
import { error as logError } from "@tauri-apps/plugin-log"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { handleMockUpdate } from "@/lib/mock-updater"
import { updaterService } from "@/services/updater"

interface UpdateCheckerProps {
  onCheckComplete?: () => void
  silent?: boolean
}

export function UpdateChecker({ onCheckComplete, silent = false }: UpdateCheckerProps) {
  const { t } = useTranslation()
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateVersion, setUpdateVersion] = useState<string>("")
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const ranOnceRef = useRef(false)

  useEffect(() => {
    // Check for updates when component mounts
    const checkForUpdates = async () => {
      // Test hooks: allow forcing outcomes via URL flags in e2e
      const handled = await handleMockUpdate({
        t,
        setUpdateAvailable,
        setUpdateVersion,
        onCheckComplete,
      })
      if (handled) return

      let updateInfo = null
      let checkError = null

      try {
        updateInfo = await updaterService.checkForUpdates()
      } catch (err) {
        checkError = err
      }

      if (updateInfo) {
        if (updateInfo.available) {
          setUpdateAvailable(true)
          setUpdateVersion(updateInfo.version || "")
          // Don't call onCheckComplete here - keep component mounted to show update card
        } else {
          if (!silent) {
            // Show dialog for manual checks
            await message(t("You're running the latest version!"), {
              title: t("No Updates Available"),
              kind: "info",
            })
          }
          // Call onCheckComplete to unmount after showing dialog
          onCheckComplete?.()
        }
      }

      if (checkError) {
        logError(`Failed to check for updates: ${checkError}`)

        if (!silent) {
          const errorMessage = checkError instanceof Error ? checkError.message : String(checkError)

          // Show dialog for errors

          // Check if it's a network/fetch error (update endpoint doesn't exist yet)
          if (
            errorMessage.includes("404") ||
            errorMessage.includes("Not Found") ||
            errorMessage.includes("fetch")
          ) {
            await message(
              t(
                "Update check is not available yet. This feature will work once the first release is published."
              ),
              {
                title: t("Update Check Unavailable"),
                kind: "info",
              }
            )
          } else if (errorMessage.includes("was not found on the response `platforms` object")) {
            await message(
              t(
                "Update server configuration incomplete (missing platform). Please try again later."
              ),
              {
                title: t("Update Check Failed"),
                kind: "error",
              }
            )
          } else {
            await message(t("Failed to check for updates: {{error}}", { error: errorMessage }), {
              title: t("Update Check Failed"),
              kind: "error",
            })
          }
        }
        // Call onCheckComplete to unmount after showing dialog
        onCheckComplete?.()
      }
    }

    // Avoid double-run in React Strict Mode (dev) by guarding with a ref
    if (ranOnceRef.current) return
    ranOnceRef.current = true
    void checkForUpdates()
  }, [onCheckComplete, silent, t]) // Include onCheckComplete in dependencies

  const installUpdate = async () => {
    try {
      setDownloading(true)
      setError(null)

      await updaterService.installUpdate((progress) => {
        setDownloadProgress(progress)
      })
    } catch (err) {
      logError(`Failed to install update: ${err}`)
      setError(err instanceof Error ? err.message : t("Failed to install update"))
    }
    setDownloading(false)
  }

  if (!updateAvailable) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-200 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t("Update Available")}</CardTitle>
          <CardDescription>
            {t("Version {{version}} is now available", { version: updateVersion })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-destructive">{error}</div>}

          {downloading && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {t("Downloading update... {{progress}}%", {
                  progress: downloadProgress.toFixed(0),
                })}
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={installUpdate} disabled={downloading} className="flex-1">
              {downloading ? t("Installing...") : t("Install Update")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateAvailable(false)
                onCheckComplete?.()
              }}
              disabled={downloading}
            >
              {t("Later")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
