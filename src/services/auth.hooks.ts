import { error as logError } from "@tauri-apps/plugin-log"
import { useCallback, useEffect, useState } from "react"
import { configService, jiraApi } from "@/services/jira"

export function useLoginStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshLoginStatus = useCallback(async () => {
    const config = await configService.get().catch((error: unknown) => {
      logError(`Failed to check login status: ${error}`)
      return undefined
    })

    if (!config) {
      setIsLoggedIn(false)
      setIsLoading(false)
      return
    }

    const hasCredentials = config.instanceUrl && config.username && config.apiToken

    if (hasCredentials) {
      try {
        await jiraApi.getCurrentUser(config)
        setIsLoggedIn(true)
      } catch (error) {
        logError(`Credentials verification failed: ${error}`)
        setIsLoggedIn(false)
      }
    } else {
      setIsLoggedIn(false)
    }

    setIsLoading(false)
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
