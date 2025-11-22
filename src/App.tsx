import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { AppMenu } from "@/components/AppMenu"
import { Login } from "@/components/Login"
import { Settings } from "@/components/Settings"
import { TaskList } from "@/components/TaskList"
import { UpdateChecker } from "@/components/UpdateChecker"
import { useTheme } from "@/hooks/useTheme"
import { useLoginStatus } from "@/services/auth.hooks"
import { useUpdateChecker } from "@/services/updater.hooks"

const queryClient = new QueryClient()

function AppContent() {
  const { showUpdateChecker, openUpdateChecker, handleUpdateCheckComplete, isSilentCheck } =
    useUpdateChecker()
  const { isLoggedIn, isLoading, handleLoginSuccess, logout } = useLoginStatus()
  const [view, setView] = useState<"tasks" | "settings">("tasks")
  useTheme()

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      )
    }

    if (isLoggedIn && view === "settings") {
      return <Settings onClose={() => setView("tasks")} />
    }

    return (
      <>
        <AppMenu onUpdateCheck={openUpdateChecker} />
        {showUpdateChecker && (
          <UpdateChecker onCheckComplete={handleUpdateCheckComplete} silent={isSilentCheck} />
        )}
        {isLoggedIn ? (
          <TaskList onLogout={logout} onOpenSettings={() => setView("settings")} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </>
    )
  }

  return <div className="h-screen w-full overflow-y-auto">{renderContent()}</div>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
