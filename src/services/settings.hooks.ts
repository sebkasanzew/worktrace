import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type AppSettings, commands, type GeneralSettings } from "@/types/bindings"

/**
 * Default general settings to use when config is missing or malformed
 */
const defaultGeneralSettings: GeneralSettings = {
  theme: "system",
  worklogTypes: [],
  defaultWorklogDescription: "",
  enableAutomaticUpdates: false,
  alwaysOnTop: false,
  customIssueKeys: [],
  roundingStep: 0,
  language: null,
}

/**
 * Ensures AppSettings has valid structure with all required fields.
 * Provides defaults for missing or malformed data to prevent white screen errors.
 */
function ensureValidSettings(data: unknown): AppSettings {
  const settings = data as Partial<AppSettings> | null | undefined

  return {
    general: settings?.general ?? defaultGeneralSettings,
    jira: settings?.jira ?? null,
  }
}

export const useAppSettings = () => {
  return useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const result = await commands.getAppSettings()
      if (result.status === "error") throw new Error(result.error)
      return ensureValidSettings(result.data)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useSaveAppSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (settings: AppSettings) => {
      const result = await commands.saveAppSettings(settings)
      if (result.status === "error") throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] })
    },
  })
}
