import { error as logError } from "@tauri-apps/plugin-log";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updaterService } from "@/services/updater";

interface UpdateCheckerProps {
  onCheckComplete?: () => void;
}

export function UpdateChecker({ onCheckComplete }: UpdateCheckerProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ranOnceRef = useRef(false);

  useEffect(() => {
    // Check for updates when component mounts
    const checkForUpdates = async () => {
      // Test hooks: allow forcing outcomes via URL flags in e2e
      const params = new URLSearchParams(window.location.search);
      if (params.get("mockUpdate") === "1") {
        setUpdateAvailable(true);
        setUpdateVersion(params.get("mockVersion") || "0.2.0");
        return;
      }
      if (params.get("mockUpdateError")) {
        try {
          const { message } = await import("@tauri-apps/plugin-dialog");
          await message(
            params.get("mockUpdateError") === "fetch"
              ? "Update check is not available yet. This feature will work once the first release is published."
              : `Failed to check for updates: ${params.get("mockUpdateError")}`,
            {
              title:
                params.get("mockUpdateError") === "fetch"
                  ? "Update Check Unavailable"
                  : "Update Check Failed",
              kind: params.get("mockUpdateError") === "fetch" ? "info" : "error",
            }
          );
        } finally {
          onCheckComplete?.();
        }
        return;
      }
      try {
        const updateInfo = await updaterService.checkForUpdates();

        if (updateInfo.available) {
          setUpdateAvailable(true);
          setUpdateVersion(updateInfo.version || "");
          // Don't call onCheckComplete here - keep component mounted to show update card
        } else {
          // Show dialog for manual checks
          const { message } = await import("@tauri-apps/plugin-dialog");
          await message("You're running the latest version!", {
            title: "No Updates Available",
            kind: "info",
          });
          // Call onCheckComplete to unmount after showing dialog
          onCheckComplete?.();
        }
      } catch (err) {
        logError(`Failed to check for updates: ${err}`);
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Show dialog for errors
        const { message } = await import("@tauri-apps/plugin-dialog");

        // Check if it's a network/fetch error (update endpoint doesn't exist yet)
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("Not Found") ||
          errorMessage.includes("fetch")
        ) {
          await message(
            "Update check is not available yet. This feature will work once the first release is published.",
            {
              title: "Update Check Unavailable",
              kind: "info",
            }
          );
        } else {
          await message(`Failed to check for updates: ${errorMessage}`, {
            title: "Update Check Failed",
            kind: "error",
          });
        }
        // Call onCheckComplete to unmount after showing dialog
        onCheckComplete?.();
      }
    };

    // Avoid double-run in React Strict Mode (dev) by guarding with a ref
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;
    void checkForUpdates();
  }, [onCheckComplete]); // Include onCheckComplete in dependencies

  const installUpdate = async () => {
    try {
      setDownloading(true);
      setError(null);

      await updaterService.installUpdate((progress) => {
        setDownloadProgress(progress);
      });
    } catch (err) {
      logError(`Failed to install update: ${err}`);
      setError(err instanceof Error ? err.message : "Failed to install update");
    } finally {
      setDownloading(false);
    }
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Update Available</CardTitle>
          <CardDescription>Version {updateVersion} is now available</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-destructive">{error}</div>}

          {downloading && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Downloading update... {downloadProgress.toFixed(0)}%
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
              {downloading ? "Installing..." : "Install Update"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setUpdateAvailable(false)}
              disabled={downloading}
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
