import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useApiClient } from "../app/components/ApiClientProvider/context"

/** Deletes every workspace and chat; resolves with the new empty workspace. */
export function useDataDeleteAll() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.dataDeleteAll(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      void queryClient.invalidateQueries({ queryKey: ["chatGetByWorkspace"] })
      void queryClient.invalidateQueries({ queryKey: ["chatMessageRunGet"] })
    },
  })
}
