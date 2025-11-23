import { useCallback, useEffect, useRef, useState } from "react"
import { useAppSettings } from "@/services/settings.hooks"

export function useUpdateChecker() {
  const [showUpdateChecker, setShowUpdateChecker] = useState(false)
  const [isSilentCheck, setIsSilentCheck] = useState(false)
  const { data: settings } = useAppSettings()
  const hasCheckedRef = useRef(false)

  const openUpdateChecker = useCallback((silent = false) => {
    setShowUpdateChecker(false)
    setIsSilentCheck(silent)
    setTimeout(() => setShowUpdateChecker(true), 10)
  }, [])

  const handleUpdateCheckComplete = useCallback(() => {
    setShowUpdateChecker(false)
    setIsSilentCheck(false)
  }, [])

  useEffect(() => {
    const handler = () => {
      openUpdateChecker(false)
    }
    window.addEventListener("worktrace:triggerUpdateCheck", handler)
    if (window.location.search.includes("openUpdate=1")) {
      setTimeout(() => setShowUpdateChecker(true), 10)
    }
    return () => window.removeEventListener("worktrace:triggerUpdateCheck", handler)
  }, [openUpdateChecker])

  useEffect(() => {
    if (settings?.general.enableAutomaticUpdates && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      openUpdateChecker(true)
    }
  }, [settings, openUpdateChecker])

  return {
    showUpdateChecker,
    openUpdateChecker,
    handleUpdateCheckComplete,
    isSilentCheck,
  } as const
}
