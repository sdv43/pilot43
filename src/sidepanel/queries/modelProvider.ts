import type { ReactNode } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  ModelProviderModel,
  OllamaModelProvider,
  OpenAIModelProvider,
  OpenRouterModelProvider,
} from "@/shared/api"

import { useApiClient } from "@/sidepanel/app/components/ApiClientProvider/context"

export type ModelProvider =
  | OllamaModelProvider
  | OpenAIModelProvider
  | OpenRouterModelProvider

export interface ModelProviderModels {
  provider: ModelProvider
  models: ModelProviderModel[]
  error?: ReactNode
}

export type {
  ModelProviderModel,
  OllamaModelProvider,
  OpenAIModelProvider,
  OpenRouterModelProvider,
}

export function useModelProviderGet(options?: { throwOnError?: boolean }) {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["modelProviderGet"],
    queryFn: async () => {
      return await apiClient.modelProviderGet()
    },
    // The settings dialog surfaces load failures inline instead of crashing
    // the whole panel, so it opts out of the global `throwOnError`.
    ...(options?.throwOnError !== undefined
      ? { throwOnError: options.throwOnError }
      : {}),
  })
}

export function useModelProviderModelsGet(providerIds?: ModelProvider["id"][]) {
  const apiClient = useApiClient()
  const providersQuery = useModelProviderGet({
    // The provider list is loaded softly here even when a caller relies on
    // the global `throwOnError`: the models query itself uses per-provider
    // try/catch and the failure is surfaced via the returned `error`.
    throwOnError: false,
  })
  const { data: providers = [] } = providersQuery

  const filteredProviders = providerIds
    ? providers.filter((p) => providerIds.includes(p.id))
    : providers

  const modelsQuery = useQuery({
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

  // When the provider list itself fails to load, the models query stays
  // disabled (and error-free). Surface the underlying error so consumers can
  // show a "could not load" state instead of an empty one.
  if (providersQuery.error) {
    return {
      // The spread keeps the query's update tracking/refetch; only the few
      // fields below are overridden to surface the providers-loading error.
      // eslint-disable-next-line @tanstack/query/no-rest-destructuring
      ...modelsQuery,
      data: [] as ModelProviderModels[],
      error: providersQuery.error,
      isLoading: false,
      isError: true,
    }
  }

  return modelsQuery
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
