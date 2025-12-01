import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { invoke } from "@tauri-apps/api/core"
import { error as logError } from "@tauri-apps/plugin-log"
import { useCallback, useEffect, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { useTranslation } from "react-i18next"
import { AppMenu } from "@/components/AppMenu"
import { ErrorFallback } from "@/components/ErrorFallback"
import { Login } from "@/components/Login"
import { MinimalView } from "@/components/MinimalView"
import { Settings } from "@/components/Settings"
import { TaskList } from "@/components/TaskList"
import { UpdateChecker } from "@/components/UpdateChecker"
import { useTheme } from "@/hooks/useTheme"
import { safeStringify } from "@/lib/utils"
import { useLoginStatus } from "@/services/auth.hooks"
import { useTimeTracker } from "@/services/time-tracker.hooks"
import { useUpdateChecker } from "@/services/updater.hooks"

const queryClient = new QueryClient()

function AppContent() {
  const { t } = useTranslation()
  const { showUpdateChecker, openUpdateChecker, handleUpdateCheckComplete, isSilentCheck } =
    useUpdateChecker()
  const { isLoggedIn, isLoading, handleLoginSuccess, logout } = useLoginStatus()
  const [view, setView] = useState<"tasks" | "settings" | "minimal">("tasks")
  const timeTracker = useTimeTracker()
  const { dialogOpen } = timeTracker
  useTheme()

  const setMiniMode = useCallback(async (enable: boolean) => {
    try {
      await invoke("set_mini_mode", { enable })
      setView(enable ? "minimal" : "tasks")
    } catch (error) {
      logError(`Failed to toggle mini mode: ${safeStringify(error)}`)
    }
  }, [])

  useEffect(() => {
    if (dialogOpen && view === "minimal") {
      setMiniMode(false)
    }
  }, [dialogOpen, view, setMiniMode])

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">{t("Loading...")}</p>
        </div>
      )
    }

    if (view === "minimal") {
      return <MinimalView onMaximize={() => setMiniMode(false)} timeTracker={timeTracker} />
    }

    const updateChecker = showUpdateChecker && (
      <UpdateChecker onCheckComplete={handleUpdateCheckComplete} silent={isSilentCheck} />
    )

    if (isLoggedIn && view === "settings") {
      return (
        <>
          {updateChecker}
          <Settings
            onClose={() => setView("tasks")}
            onCheckForUpdates={() => openUpdateChecker(false)}
            isChecking={showUpdateChecker}
          />
        </>
      )
    }

    return (
      <>
        <AppMenu onUpdateCheck={openUpdateChecker} />
        {updateChecker}
        {isLoggedIn ? (
          <TaskList
            onLogout={logout}
            onOpenSettings={() => setView("settings")}
            onEnterMiniMode={() => setMiniMode(true)}
            timeTracker={timeTracker}
          />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </>
    )
  }

  return (
    <div
      className={`h-screen w-full ${view === "minimal" ? "overflow-hidden" : "overflow-y-auto"}`}
    >
      {renderContent()}
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
