import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Command } from "@/shared/api"

import { useApiClient } from "@/sidepanel/app/components/ApiClientProvider/context"

export const commandGetQueryKey = ["commandGet"] as const

export function useCommandGet() {
  const apiClient = useApiClient()
  return useQuery({
    queryKey: commandGetQueryKey,
    queryFn: async () => {
      return await apiClient.commandGet()
    },
  })
}

export function useCommandCreate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      command: Pick<Command, "description" | "name" | "prompt">,
    ) => {
      return await apiClient.commandCreate(command)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commandGetQueryKey })
    },
  })
}

export function useCommandUpdate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (command: Command) => {
      return await apiClient.commandUpdate(command)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commandGetQueryKey })
    },
  })
}

export function useCommandDelete() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: Command["id"]) => {
      await apiClient.commandDelete(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commandGetQueryKey })
    },
  })
}
