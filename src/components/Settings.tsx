import { Loader2, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ViewHeader } from "@/components/ViewHeader"
import { useAppSettings, useSaveAppSettings } from "@/services/settings.hooks"
import type { AppSettings, GeneralSettings, JiraSettings, WorklogType } from "@/types/bindings"

interface SettingsProps {
  onClose: () => void
  onCheckForUpdates: () => void
}

export function Settings({ onClose, onCheckForUpdates }: SettingsProps) {
  const { t, i18n } = useTranslation()
  const { data: settings, isLoading, error } = useAppSettings()
  const saveMutation = useSaveAppSettings()

  const [formData, setFormData] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <div className="text-destructive">Failed to load settings</div>
        <div className="text-sm text-muted-foreground">{error.message}</div>
        <Button onClick={onClose}>Close</Button>
      </div>
    )
  }

  if (!formData) {
    return null
  }

  const themeLabels: Record<string, string> = {
    system: t("system"),
    dark: t("dark"),
    light: t("light"),
  }

  const updateGeneralField = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) => {
    setFormData((prev: AppSettings | null) => {
      if (!prev) return null
      const newState = {
        ...prev,
        general: { ...prev.general, [key]: value },
      }
      if (newState) {
        saveMutation.mutate(newState)
      }
      return newState
    })
  }

  const updateJiraField = <K extends keyof JiraSettings>(key: K, value: JiraSettings[K]) => {
    setFormData((prev: AppSettings | null) => {
      if (!prev) return null
      const currentJira = prev.jira || { instanceUrl: "", username: "", apiToken: "" }
      const newState = {
        ...prev,
        jira: { ...currentJira, [key]: value },
      }
      if (newState) {
        saveMutation.mutate(newState)
      }
      return newState
    })
  }

  const addWorklogType = () => {
    setFormData((prev: AppSettings | null) => {
      if (!prev) return null
      const newState = {
        ...prev,
        general: {
          ...prev.general,
          worklogTypes: [...prev.general.worklogTypes, { name: t("New Type"), shortCode: "" }],
        },
      }
      saveMutation.mutate(newState)
      return newState
    })
  }

  const removeWorklogType = (index: number) => {
    setFormData((prev: AppSettings | null) => {
      if (!prev) return null
      const newTypes = [...prev.general.worklogTypes]
      newTypes.splice(index, 1)
      const newState = {
        ...prev,
        general: { ...prev.general, worklogTypes: newTypes },
      }
      saveMutation.mutate(newState)
      return newState
    })
  }

  const updateWorklogType = (index: number, field: keyof WorklogType, value: string) => {
    setFormData((prev: AppSettings | null) => {
      if (!prev) return null
      const newTypes = [...prev.general.worklogTypes]
      newTypes[index] = { ...newTypes[index], [field]: value }
      const newState = {
        ...prev,
        general: { ...prev.general, worklogTypes: newTypes },
      }
      saveMutation.mutate(newState)
      return newState
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <ViewHeader
        title={t("Settings")}
        actions={
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("Close")}
          </Button>
        }
      />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold mb-4">{t("JIRA Configuration")}</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="jiraUrl" className="block text-sm font-medium mb-1">
                      {t("JIRA URL")}
                    </label>
                    <Input
                      id="jiraUrl"
                      value={formData.jira?.instanceUrl || ""}
                      onChange={(e) => updateJiraField("instanceUrl", e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="jiraUsername" className="block text-sm font-medium mb-1">
                      {t("Username")} ({t("Email Address")})
                    </label>
                    <Input
                      id="jiraUsername"
                      value={formData.jira?.username || ""}
                      onChange={(e) => updateJiraField("username", e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="jiraToken" className="block text-sm font-medium mb-1">
                      {t("API Token")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="jiraToken"
                        type="password"
                        value={formData.jira?.apiToken || ""}
                        onChange={(e) => updateJiraField("apiToken", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">{t("Language")}</h2>
                <div className="flex gap-4 mb-6">
                  <Button
                    variant={i18n.resolvedLanguage === "en" ? "default" : "outline"}
                    onClick={() => i18n.changeLanguage("en")}
                    size="sm"
                  >
                    English
                  </Button>
                  <Button
                    variant={i18n.resolvedLanguage === "de" ? "default" : "outline"}
                    onClick={() => i18n.changeLanguage("de")}
                    size="sm"
                  >
                    Deutsch
                  </Button>
                </div>

                <h2 className="text-xl font-semibold mb-4">{t("Theme")}</h2>
                <div className="flex gap-4">
                  {(["system", "dark", "light"] as const).map((theme) => (
                    <label key={theme} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value={theme}
                        checked={formData.general.theme === theme}
                        onChange={() => updateGeneralField("theme", theme)}
                      />
                      <span className="capitalize">{themeLabels[theme]}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">{t("Other")}</h2>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.general.enableAutomaticUpdates}
                      onChange={(e) =>
                        updateGeneralField("enableAutomaticUpdates", e.target.checked)
                      }
                    />
                    {t("Enable Automatic Updates")}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.general.alwaysOnTop}
                      onChange={(e) => updateGeneralField("alwaysOnTop", e.target.checked)}
                    />
                    {t("Always on Top")}
                  </label>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={onCheckForUpdates}>
                      {t("Check for Updates")}
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold mb-4">{t("Worklog Types")}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-[1fr_160px_40px] gap-2 font-medium text-sm text-muted-foreground">
                    <div>{t("Type Name")}</div>
                    <div>{t("Comment Prefix")}</div>
                    <div></div>
                  </div>
                  {formData.general.worklogTypes.map((type: WorklogType, index: number) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: simple list
                    <div key={index} className="grid grid-cols-[1fr_160px_40px] gap-2 items-center">
                      <Input
                        value={type.name}
                        onChange={(e) => updateWorklogType(index, "name", e.target.value)}
                        placeholder={t("Type Name")}
                      />
                      <Input
                        value={type.shortCode}
                        onChange={(e) => updateWorklogType(index, "shortCode", e.target.value)}
                        placeholder="(Code)"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeWorklogType(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addWorklogType} className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> {t("Add Type")}
                  </Button>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">{t("Work Log Preferences")}</h2>
                <div>
                  <label htmlFor="defaultDesc" className="block text-sm font-medium mb-1">
                    {t("Default Worklog Description")}
                  </label>
                  <Input
                    id="defaultDesc"
                    value={formData.general.defaultWorklogDescription}
                    onChange={(e) =>
                      updateGeneralField("defaultWorklogDescription", e.target.value)
                    }
                  />
                </div>
              </section>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          {saveMutation.isPending ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {t("Save")}...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
