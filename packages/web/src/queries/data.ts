import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useApiClient } from "../app/components/ApiClientProvider/context"

/**
 * Deletes every workspace and chat (and, with `includeConfig`, providers and
 * MCP servers); resolves with the new empty workspace.
 */
export function useDataDeleteAll() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (options?: { includeConfig?: boolean }) =>
      apiClient.dataDeleteAll(options),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["modelProviderGet"] })
      void queryClient.invalidateQueries({ queryKey: ["mcpServerGet"] })
      void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      void queryClient.invalidateQueries({ queryKey: ["chatGetByWorkspace"] })
      void queryClient.invalidateQueries({ queryKey: ["chatMessageRunGet"] })
    },
  })
}
