import { error as logError } from "@tauri-apps/plugin-log"
import { useCallback, useEffect, useState } from "react"
import { configService } from "@/services/jira"

export function useLoginStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshLoginStatus = useCallback(async () => {
    try {
      const config = await configService.get()
      setIsLoggedIn(!!(config.url && config.username && config.password))
    } catch (error) {
      logError(`Failed to check login status: ${error}`)
      setIsLoggedIn(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshLoginStatus()
  }, [refreshLoginStatus])

  const handleLoginSuccess = useCallback(() => {
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(async () => {
    await configService.clear()
    setIsLoggedIn(false)
  }, [])

  return {
    isLoggedIn,
    isLoading,
    refreshLoginStatus,
    handleLoginSuccess,
    logout,
  } as const
}
