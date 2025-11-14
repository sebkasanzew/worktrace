import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { configService } from "@/services/jira"

// Zod schema for form validation
const loginSchema = z.object({
  url: z
    .string()
    .min(1, "JIRA URL is required")
    .url("Must be a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "URL must use HTTPS",
    }),
  username: z.string().min(1, "Email/Username is required"),
  password: z.string().min(1, "API Token/Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginProps {
  onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [useApiToken, setUseApiToken] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      url: "",
      username: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)

    try {
      await configService.save(data)
      onLoginSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Worktrace - JIRA Configuration</CardTitle>
          <CardDescription>Enter your JIRA credentials to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                JIRA URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://your-domain.atlassian.net"
                {...register("url")}
              />
              {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                {useApiToken ? "Email Address" : "Username"}
              </label>
              <Input
                id="username"
                type={useApiToken ? "email" : "text"}
                placeholder={useApiToken ? "your-email@example.com" : "your-username"}
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  {useApiToken ? "API Token" : "Password"}
                </label>
                <button
                  type="button"
                  onClick={() => setUseApiToken(!useApiToken)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Use {useApiToken ? "password" : "API token"} instead
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={useApiToken ? "Your JIRA API token" : "Your JIRA password"}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              {useApiToken && (
                <p className="text-xs text-muted-foreground">
                  Create an API token at:{" "}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    id.atlassian.com/manage-profile/security/api-tokens
                  </a>
                </p>
              )}
              {!useApiToken && (
                <p className="text-xs text-muted-foreground">
                  Note: Password authentication may not work with JIRA Cloud. Use API token for
                  better security.
                </p>
              )}
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
