import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { info, error as logError } from "@tauri-apps/plugin-log"
import { relaunch } from "@tauri-apps/plugin-process"

export interface UpdateInfo {
  available: boolean
  currentVersion?: string
  version?: string
  body?: string
  date?: string
}

interface RustUpdateInfo {
  available: boolean
  current_version: string
  version: string
  body: string | null
  date: string | null
}

interface ProgressEvent {
  event: string
  chunk_length?: number
  content_length?: number
}

export const updaterService = {
  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      info("Checking for updates...")
      const update = await invoke<RustUpdateInfo>("check_update")

      if (update.available) {
        info(`Update available: ${update.current_version} -> ${update.version}`)
        return {
          available: true,
          currentVersion: update.current_version,
          version: update.version,
          body: update.body || undefined,
          date: update.date || undefined,
        }
      }

      info("No updates available")
      return { available: false }
    } catch (err) {
      logError(`Failed to check for updates: ${err}`)
      throw err
    }
  },

  /**
   * Download and install an available update
   * @param onProgress - Optional callback for download progress
   */
  async installUpdate(onProgress?: (progress: number) => void): Promise<void> {
    try {
      info("Downloading and installing update...")

      let unlisten: (() => void) | undefined

      if (onProgress) {
        unlisten = await listen<ProgressEvent>("update-progress", (event) => {
          const { event: status } = event.payload
          if (status === "Started") {
            onProgress(0)
          } else if (status === "Progress") {
            onProgress(50)
          } else if (status === "Finished") {
            onProgress(100)
          }
        })
      }

      await invoke("install_update")

      if (unlisten) unlisten()

      info("Update installed successfully. Restarting application...")

      // Relaunch the application after installation
      await relaunch()
    } catch (err) {
      logError(`Failed to install update: ${err}`)
      throw err
    }
  },
}
