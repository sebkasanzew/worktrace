import { message } from "@tauri-apps/plugin-dialog"
import { error as logError } from "@tauri-apps/plugin-log"
import type { TFunction } from "i18next"

interface HandleMockUpdateParams {
  t: TFunction
  setUpdateAvailable: (available: boolean) => void
  setUpdateVersion: (version: string) => void
  onCheckComplete?: () => void
}

/**
 * Handles mock update scenarios triggered by URL parameters.
 * Used primarily for E2E testing.
 *
 * @returns true if a mock update scenario was handled, false otherwise
 */
export async function handleMockUpdate({
  t,
  setUpdateAvailable,
  setUpdateVersion,
  onCheckComplete,
}: HandleMockUpdateParams): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)

  if (params.get("mockUpdate") === "1") {
    setUpdateAvailable(true)
    setUpdateVersion(params.get("mockVersion") || "0.2.0")
    return true
  }

  if (params.get("mockUpdateError")) {
    const isFetchError = params.get("mockUpdateError") === "fetch"
    const messageText = isFetchError
      ? t(
          "Update check is not available yet. This feature will work once the first release is published."
        )
      : t("Failed to check for updates: {{error}}", {
          error: params.get("mockUpdateError"),
        })
    const title = isFetchError ? t("Update Check Unavailable") : t("Update Check Failed")
    const kind = isFetchError ? "info" : "error"

    try {
      await message(messageText, { title, kind })
    } catch (err) {
      logError(`Failed to show mock update error: ${err}`)
    }
    onCheckComplete?.()
    return true
  }

  return false
}
