import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { configService, jiraApi } from "@/services/jira";
import { JiraConfig } from "@/types/jira";
import { LogOut, RefreshCw } from "lucide-react";

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
  } = useQuery({
    queryKey: ["jiraIssues", config],
    queryFn: () => config ? jiraApi.getCurrentUserIssues(config) : Promise.resolve({ issues: [], total: 0 }),
    enabled: !!config?.url && !!config?.email && !!config?.token,
    refetchInterval: 60000, // Refetch every minute
  });

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
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Error loading issues: {error instanceof Error ? error.message : "Unknown error"}
              </p>
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
              Showing {issues.issues.length} of {issues.total} issues
            </div>
            <div className="space-y-4">
              {issues.issues.map((issue) => (
                <Card key={issue.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{issue.key}</CardTitle>
                        <CardDescription className="mt-1">
                          {issue.fields.summary}
                        </CardDescription>
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
                      <div>
                        Updated: {new Date(issue.fields.updated).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {issues.issues.length === 0 && (
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
