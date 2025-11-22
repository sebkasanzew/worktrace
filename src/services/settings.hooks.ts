import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type AppSettings, commands } from "@/types/bindings"

export const useAppSettings = () => {
  return useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const result = await commands.getAppSettings()
      if (result.status === "error") throw new Error(result.error)
      return result.data
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
