import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Login } from "@/components/Login";
import { TaskList } from "@/components/TaskList";
import { configService } from "@/services/jira";

const queryClient = new QueryClient();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkLoginStatus = useCallback(async () => {
    try {
      const config = await configService.get();
      setIsLoggedIn(!!(config.url && config.username && config.password));
    } catch (error) {
      console.error("Failed to check login status:", error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isLoggedIn ? (
        <TaskList onLogout={() => setIsLoggedIn(false)} />
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </QueryClientProvider>
  );
}

export default App;
