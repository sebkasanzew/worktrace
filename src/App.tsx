import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { error as logError } from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useState } from "react";
import { AppMenu } from "@/components/AppMenu";
import { Login } from "@/components/Login";
import { TaskList } from "@/components/TaskList";
// import { UpdateChecker } from "@/components/UpdateChecker"; // Disabled for now
import { configService } from "@/services/jira";

const queryClient = new QueryClient();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // const [showUpdateChecker, setShowUpdateChecker] = useState(false); // Disabled for now

  const checkLoginStatus = useCallback(async () => {
    try {
      const config = await configService.get();
      setIsLoggedIn(!!(config.url && config.username && config.password));
    } catch (error) {
      logError(`Failed to check login status: ${error}`);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  const handleManualUpdateCheck = useCallback(() => {
    // Disabled for now - to be fixed later
    // Unmount and remount the UpdateChecker to trigger a fresh check
    // setShowUpdateChecker(false);
    // setTimeout(() => setShowUpdateChecker(true), 10);
  }, []);

  // const handleUpdateCheckComplete = useCallback(() => {
  //   // Unmount the UpdateChecker after showing dialogs
  //   setShowUpdateChecker(false);
  // }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppMenu onUpdateCheck={handleManualUpdateCheck} />
      {/* UpdateChecker disabled - to be fixed later */}
      {/* {showUpdateChecker && <UpdateChecker onCheckComplete={handleUpdateCheckComplete} />} */}
      {isLoggedIn ? (
        <TaskList onLogout={() => setIsLoggedIn(false)} />
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </QueryClientProvider>
  );
}

export default App;
