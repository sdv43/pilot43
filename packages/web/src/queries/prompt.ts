import type { Prompt } from "@pilot43/protocol"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApiClient } from "../app/components/ApiClientProvider/context"

export const promptGetQueryKey = ["promptGet"] as const

export function usePromptGet() {
  const apiClient = useApiClient()

  return useQuery({
    queryFn: () => apiClient.promptGet(),
    queryKey: promptGetQueryKey,
  })
}

export function usePromptCreate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (prompt: Pick<Prompt, "text" | "title">) =>
      apiClient.promptCreate(prompt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promptGetQueryKey })
    },
  })
}

export function usePromptUpdate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (prompt: Prompt) => apiClient.promptUpdate(prompt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promptGetQueryKey })
    },
  })
}

export function usePromptDelete() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: Prompt["id"]) => apiClient.promptDelete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promptGetQueryKey })
    },
  })
}
