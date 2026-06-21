import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  ModelProviderModel,
  OllamaModelProvider,
  OpenAIModelProvider,
} from "@/shared/api"

import { useApiClient } from "@/sidepanel/app/components/ApiClientProvider/context"

export type ModelProvider = OllamaModelProvider | OpenAIModelProvider

export interface ModelProviderModels {
  provider: ModelProvider
  models: ModelProviderModel[]
  error?: string
}

export type { ModelProviderModel, OllamaModelProvider, OpenAIModelProvider }

export function useModelProviderGet() {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["modelProviderGet"],
    queryFn: async () => {
      return await apiClient.modelProviderGet()
    },
  })
}

export function useModelProviderModelsGet(providerIds?: ModelProvider["id"][]) {
  const apiClient = useApiClient()
  const { data: providers = [] } = useModelProviderGet()

  const filteredProviders = providerIds
    ? providers.filter((p) => providerIds.includes(p.id))
    : providers

  return useQuery({
    queryKey: ["modelProviderModelsGet", filteredProviders.map((p) => p.id)],
    queryFn: async () => {
      const modelProviderGroups: ModelProviderModels[] = await Promise.all(
        filteredProviders.map(async (provider) => {
          try {
            const models = await apiClient.modelProviderModelGet(provider.id)

            return {
              provider,
              models,
            }
          } catch (error) {
            return {
              provider,
              models: [],
              error: error instanceof Error ? error.message : "Unknown error",
            }
          }
        }),
      )

      return modelProviderGroups
    },
    enabled: providers.length > 0,
  })
}

export function useModelProviderTypeGet() {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["modelProviderTypeGet"],
    queryFn: async () => {
      return await apiClient.modelProviderTypeGet()
    },
  })
}

export function useModelProviderCreate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      provider: Pick<
        ModelProvider,
        "maxRequestPerMinute" | "name" | "settings" | "type"
      >,
    ) => {
      return await apiClient.modelProviderCreate(provider)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["modelProviderGet"] })
      void queryClient.invalidateQueries({
        queryKey: ["modelProviderModelsGet"],
      })
    },
  })
}

export function useModelProviderUpdate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (provider: ModelProvider) => {
      return await apiClient.modelProviderUpdate(provider)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["modelProviderGet"] })
      void queryClient.invalidateQueries({
        queryKey: ["modelProviderModelsGet"],
      })
    },
  })
}

export function useModelProviderDelete() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: ModelProvider["id"]) => {
      return await apiClient.modelProviderDelete(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["modelProviderGet"] })
      void queryClient.invalidateQueries({
        queryKey: ["modelProviderModelsGet"],
      })
    },
  })
}

export function useModelProviderCheck() {
  const apiClient = useApiClient()

  return useMutation({
    mutationFn: async (provider: ModelProvider) => {
      return await apiClient.modelProviderCheck(provider)
    },
  })
}
