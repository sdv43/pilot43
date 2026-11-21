import { useQueries } from "@tanstack/react-query"

import { useWorkspaceGet } from "../../../../../queries/workspace"
import { useApiClient } from "../../../../components/ApiClientProvider/context"

/**
 * Workspaces and their chats, for the delete-all confirmation and the chat
 * history preview.
 */
export function useDataCounts() {
  const apiClient = useApiClient()
  const { data: workspaces = [] } = useWorkspaceGet()
  const chats = useQueries({
    queries: workspaces.map((workspace) => ({
      queryFn: () => apiClient.chatGetByWorkspace(workspace.id),
      queryKey: ["chatGetByWorkspace", workspace.id],
    })),
    combine: (results) => results.flatMap((query) => query.data ?? []),
  })

  return {
    chatList: chats,
    chats: chats.length,
    workspaces: workspaces.length,
  }
}
