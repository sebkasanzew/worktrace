import { useQuery } from "@tanstack/react-query";
import { info } from "@tauri-apps/plugin-log";
import { LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { configService, jiraApi } from "@/services/jira";
import type { JiraConfig } from "@/types/jira";

interface TaskListProps {
  onLogout: () => void;
}

export function TaskList({ onLogout }: TaskListProps) {
  const { data: config } = useQuery<JiraConfig>({
    queryKey: ["jiraConfig"],
    queryFn: () => configService.get(),
  });

  const {
    data: issues,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["jiraIssues", config],
    queryFn: () =>
      config ? jiraApi.getCurrentUserIssues(config) : Promise.resolve({ issues: [], total: 0 }),
    enabled: !!config?.url && !!config?.username && !!config?.password,
    refetchInterval: 60000, // Refetch every minute
    retry: false, // Don't retry failed requests automatically
  });

  const handleRefresh = async () => {
    info("[TaskList] Manual refresh triggered");
    await refetch();
  };

  const handleLogout = async () => {
    await configService.clear();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My JIRA Issues</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive font-medium mb-2">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
              <p className="text-sm text-muted-foreground">
                Check the developer console (View → Developer → Toggle Developer Tools) for more
                details.
              </p>
              {config && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <p>JIRA URL: {config.url}</p>
                  <p>Username: {config.username}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <p className="text-muted-foreground">Loading issues...</p>
          </div>
        )}

        {!isLoading && issues && (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {issues.issues?.length || 0} issues
            </div>
            <div className="space-y-4">
              {issues.issues?.map((issue) => (
                <Card key={issue.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{issue.key}</CardTitle>
                        <CardDescription className="mt-1">{issue.fields.summary}</CardDescription>
                      </div>
                      <div className="text-sm font-medium px-3 py-1 bg-secondary rounded-md">
                        {issue.fields.status.name}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <div>
                        {issue.fields.assignee && (
                          <span>Assigned to: {issue.fields.assignee.displayName}</span>
                        )}
                      </div>
                      <div>Updated: {new Date(issue.fields.updated).toLocaleDateString()}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(!issues.issues || issues.issues.length === 0) && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No unresolved issues assigned to you.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
