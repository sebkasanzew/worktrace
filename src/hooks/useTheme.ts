import { useEffect } from "react"
import { useAppSettings } from "@/services/settings.hooks"

export function useTheme() {
  const { data: settings } = useAppSettings()

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    const theme = settings?.theme || "system"

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [settings?.theme])
}
