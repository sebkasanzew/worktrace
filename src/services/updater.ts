import { debug, info, error as logError } from "@tauri-apps/plugin-log";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

export interface UpdateInfo {
  available: boolean;
  currentVersion?: string;
  version?: string;
}

export const updaterService = {
  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      info("Checking for updates...");
      const update = await check();

      if (update) {
        info(`Update available: ${update.currentVersion} -> ${update.version}`);
        return {
          available: true,
          currentVersion: update.currentVersion,
          version: update.version,
        };
      }

      info("No updates available");
      return { available: false };
    } catch (err) {
      logError(`Failed to check for updates: ${err}`);
      throw err;
    }
  },

  /**
   * Download and install an available update
   * @param onProgress - Optional callback for download progress
   */
  async installUpdate(onProgress?: (progress: number) => void): Promise<void> {
    try {
      const update = await check();
      if (!update) {
        throw new Error("No update available");
      }

      info("Downloading and installing update...");

      // Download and install the update
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            info("Update download started");
            onProgress?.(0);
            break;
          case "Progress":
            debug(`Download progress: ${JSON.stringify(event.data)}`);
            // Note: Progress tracking is simplified since exact progress is not available
            onProgress?.(50);
            break;
          case "Finished":
            info("Update download finished");
            onProgress?.(100);
            break;
        }
      });

      info("Update installed successfully. Restarting application...");

      // Relaunch the application after installation
      await relaunch();
    } catch (err) {
      logError(`Failed to install update: ${err}`);
      throw err;
    }
  },
};
