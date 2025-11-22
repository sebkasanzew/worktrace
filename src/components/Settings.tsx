import { Loader2, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAppSettings, useSaveAppSettings } from "@/services/settings.hooks"
import type { AppSettings, WorklogType } from "@/types/bindings"

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
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

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setFormData((prev: AppSettings | null) => {
      const newState = prev ? { ...prev, [key]: value } : null
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
        worklogTypes: [...prev.worklogTypes, { name: "New Type", shortCode: "" }],
      }
      saveMutation.mutate(newState)
      return newState
    })
  }

  const removeWorklogType = (index: number) => {
    setFormData((prev: AppSettings | null) => {
      if (!prev) return null
      const newTypes = [...prev.worklogTypes]
      newTypes.splice(index, 1)
      const newState = { ...prev, worklogTypes: newTypes }
      saveMutation.mutate(newState)
      return newState
    })
  }

  const updateWorklogType = (index: number, field: keyof WorklogType, value: string) => {
    setFormData((prev: AppSettings | null) => {
      if (!prev) return null
      const newTypes = [...prev.worklogTypes]
      newTypes[index] = { ...newTypes[index], [field]: value }
      const newState = { ...prev, worklogTypes: newTypes }
      saveMutation.mutate(newState)
      return newState
    })
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">JIRA Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="jiraUrl" className="block text-sm font-medium mb-1">
                    JIRA Instance URL
                  </label>
                  <Input
                    id="jiraUrl"
                    value={formData.jiraInstanceUrl}
                    onChange={(e) => updateField("jiraInstanceUrl", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="jiraUsername" className="block text-sm font-medium mb-1">
                    Username (Email)
                  </label>
                  <Input
                    id="jiraUsername"
                    value={formData.jiraUsername}
                    onChange={(e) => updateField("jiraUsername", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="jiraToken" className="block text-sm font-medium mb-1">
                    API Token
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="jiraToken"
                      type="password"
                      value={formData.jiraApiToken}
                      onChange={(e) => updateField("jiraApiToken", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Appearance</h2>
              <div className="flex gap-4">
                {["system", "dark", "light"].map((theme) => (
                  <label key={theme} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={formData.theme === theme}
                      onChange={() => updateField("theme", theme)}
                    />
                    <span className="capitalize">{theme}</span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Other</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableAutomaticUpdates}
                    onChange={(e) => updateField("enableAutomaticUpdates", e.target.checked)}
                  />
                  Enable Automatic Updates
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.alwaysOnTop}
                    onChange={(e) => updateField("alwaysOnTop", e.target.checked)}
                  />
                  Always Keep Window on Top
                </label>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Worklog Types</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_120px_40px] gap-2 font-medium text-sm text-muted-foreground">
                  <div>Type Name</div>
                  <div>Comment Prefix</div>
                  <div></div>
                </div>
                {formData.worklogTypes.map((type: WorklogType, index: number) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: simple list
                  <div key={index} className="grid grid-cols-[1fr_120px_40px] gap-2 items-center">
                    <Input
                      value={type.name}
                      onChange={(e) => updateWorklogType(index, "name", e.target.value)}
                      placeholder="Type Name"
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
                  <Plus className="h-4 w-4 mr-2" /> Add Type
                </Button>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Work Log Preferences</h2>
              <div>
                <label htmlFor="defaultDesc" className="block text-sm font-medium mb-1">
                  Default Work Log Description
                </label>
                <Input
                  id="defaultDesc"
                  value={formData.defaultWorklogDescription}
                  onChange={(e) => updateField("defaultWorklogDescription", e.target.value)}
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
            Saving...
          </div>
        ) : null}
      </div>
    </div>
  )
}
