import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppMenu } from "@/components/AppMenu"
import { Login } from "@/components/Login"
import { TaskList } from "@/components/TaskList"
import { UpdateChecker } from "@/components/UpdateChecker"
import { useLoginStatus } from "@/services/auth.hooks"
import { useUpdateChecker } from "@/services/updater.hooks"

const queryClient = new QueryClient()

function App() {
  const { showUpdateChecker, openUpdateChecker, handleUpdateCheckComplete } = useUpdateChecker()
  const { isLoggedIn, isLoading, handleLoginSuccess, logout } = useLoginStatus()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppMenu onUpdateCheck={openUpdateChecker} />
      {showUpdateChecker && <UpdateChecker onCheckComplete={handleUpdateCheckComplete} />}
      {isLoggedIn ? <TaskList onLogout={logout} /> : <Login onLoginSuccess={handleLoginSuccess} />}
    </QueryClientProvider>
  )
}

export default App
