import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { configService } from "@/services/jira";

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await configService.save({ url, email, token });
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Worktrace - JIRA Configuration</CardTitle>
          <CardDescription>
            Enter your JIRA credentials to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                JIRA URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://your-domain.atlassian.net"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                API Token
              </label>
              <Input
                id="token"
                type="password"
                placeholder="Your JIRA API token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Generate an API token at{" "}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Atlassian Account Settings
                </a>
              </p>
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
