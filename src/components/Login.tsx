import { zodResolver } from "@hookform/resolvers/zod"
import { error as logError } from "@tauri-apps/plugin-log"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { safeStringify } from "@/lib/utils"
import { configService, jiraApi } from "@/services/jira"

// Zod schema for form validation
type LoginFormData = {
  url: string
  username: string
  password: string
}

interface LoginProps {
  onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps) {
  const { t } = useTranslation()
  const [useApiToken, setUseApiToken] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loginSchema = z.object({
    url: z
      .string()
      .min(1, t("JIRA URL is required"))
      .url(t("Must be a valid URL"))
      .refine((url) => url.startsWith("https://"), {
        message: t("URL must use HTTPS"),
      }),
    username: z.string().min(1, t("Email/Username is required")),
    password: z.string().min(1, t("API Token/Password is required")),
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      url: "",
      username: "",
      password: "",
    },
  })

  useEffect(() => {
    const loadConfig = async () => {
      const config = await configService.get().catch(() => undefined)
      if (config) {
        setValue("url", config.instanceUrl)
        setValue("username", config.username)
        if (config.username && !config.username.includes("@")) {
          setUseApiToken(false)
        }
      }
    }
    loadConfig()
  }, [setValue])

  const onSubmit = async (data: LoginFormData) => {
    setError(null)

    try {
      const settings = {
        instanceUrl: data.url,
        username: data.username,
        apiToken: data.password,
      }

      // Verify credentials before saving
      const session = await jiraApi.getCurrentUser(settings)

      const settingsToSave = {
        ...settings,
        apiVersion: session.apiVersion,
        authType: session.authType,
      }

      await configService.save(settingsToSave)
      onLoginSuccess()
    } catch (err) {
      logError(safeStringify(err))
      setError(t("Failed to connect to JIRA. Please check your credentials."))
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("Worktrace - JIRA Configuration")}</CardTitle>
          <CardDescription>{t("Enter your JIRA credentials to get started")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                {t("JIRA URL")}
              </label>
              <Input
                id="url"
                type="url"
                placeholder={t("https://your-domain.atlassian.net")}
                {...register("url")}
              />
              {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                {useApiToken ? t("Email Address") : t("Username")}
              </label>
              <Input
                id="username"
                type={useApiToken ? "email" : "text"}
                placeholder={useApiToken ? t("your-email@example.com") : t("your-username")}
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  {useApiToken ? t("API Token") : t("Password")}
                </label>
                <button
                  type="button"
                  onClick={() => setUseApiToken(!useApiToken)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {useApiToken ? t("Use Password") : t("Use API Token")}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={useApiToken ? t("API Token") : t("Password")}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              {useApiToken && (
                <p className="text-xs text-muted-foreground">
                  {t("Create an API token at:")}{" "}
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
                  {t(
                    "Note: Password authentication may not work with JIRA Cloud. Use API token for better security."
                  )}
                </p>
              )}
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? `${t("Save")}...` : t("Connect to JIRA")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
