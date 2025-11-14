import { info } from "@tauri-apps/plugin-log"
import { useEffect } from "react"

interface AppMenuProps {
  onUpdateCheck: () => void
}

export function AppMenu({ onUpdateCheck }: AppMenuProps) {
  useEffect(() => {
    // Listen for menu events from the native menu
    const setupMenuListeners = async () => {
      // Import event listener
      const { listen } = await import("@tauri-apps/api/event")

      // Listen for menu://check-for-updates event from menu
      const unlisten = await listen("menu://check-for-updates", async () => {
        info("Manual update check requested from menu")
        onUpdateCheck()
      })

      return unlisten
    }

    let unlistenFn: (() => void) | undefined

    setupMenuListeners().then((unlisten) => {
      unlistenFn = unlisten
    })

    return () => {
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [onUpdateCheck])

  return null // This component doesn't render anything
}
