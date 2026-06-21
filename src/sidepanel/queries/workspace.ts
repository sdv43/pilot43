import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Args, Result } from "./types"

import { useApiClient } from "../app/components/ApiClientProvider/context"

export function useWorkspaceGet() {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["workspaceGet"],
    queryFn: async () => {
      return await apiClient.workspaceGet()
    },
  })
}

export function useWorkspaceCreate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<Result<"workspaceCreate">, Error, Args<"workspaceCreate">>(
    {
      mutationKey: ["workspaceCreate"],
      mutationFn: async (workspace) => {
        return await apiClient.workspaceCreate(workspace)
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      },
    },
  )
}

export function useWorkspaceUpdate() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<Result<"workspaceUpdate">, Error, Args<"workspaceUpdate">>(
    {
      mutationKey: ["workspaceUpdate"],
      mutationFn: async (workspace) => {
        return await apiClient.workspaceUpdate(workspace)
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      },
    },
  )
}

export function useWorkspaceDelete() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  return useMutation<Result<"workspaceDelete">, Error, Args<"workspaceDelete">>(
    {
      mutationKey: ["workspaceDelete"],
      mutationFn: async (workspaceId) => {
        return await apiClient.workspaceDelete(workspaceId)
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      },
    },
  )
}
