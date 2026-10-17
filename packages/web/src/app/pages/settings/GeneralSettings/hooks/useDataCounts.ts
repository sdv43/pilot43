import { useQueries } from "@tanstack/react-query"

import { useWorkspaceGet } from "../../../../../queries/workspace"
import { useApiClient } from "../../../../components/ApiClientProvider/context"

/** Number of workspaces and chats, for the delete-all confirmation. */
export function useDataCounts() {
  const apiClient = useApiClient()
  const { data: workspaces = [] } = useWorkspaceGet()
  const chats = useQueries({
    queries: workspaces.map((workspace) => ({
      queryFn: () => apiClient.chatGetByWorkspace(workspace.id),
      queryKey: ["chatGetByWorkspace", workspace.id],
    })),
  })

  return {
    chats: chats.reduce((total, query) => total + (query.data?.length ?? 0), 0),
    workspaces: workspaces.length,
  }
}
