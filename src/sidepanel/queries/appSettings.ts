import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { AppSettings } from "@/shared/api"

import { useApiClient } from "@/sidepanel/app/components/ApiClientProvider/context"

export function useAppSettingsGet() {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["appSettingsGet"],
    queryFn: async () => {
      return await apiClient.appSettingsGet()
    },
  })
}

export function useAppSettingsUpdate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: AppSettings) => {
      return await apiClient.appSettingsUpdate(settings)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appSettingsGet"] })
    },
  })
}
