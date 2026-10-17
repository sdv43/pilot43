import { type McpServer, removeMcpServerFromWorkspace } from "@pilot43/protocol"

import {
  useMcpServerGet,
  useMcpServerUpdate,
} from "../../../../../queries/mcpServer"
import {
  useWorkspaceGet,
  useWorkspaceUpdate,
} from "../../../../../queries/workspace"
import { toast } from "../../../../components/ToastProvider"

/**
 * Deletes an MCP server and removes it from the allowlists and permissions of
 * every workspace.
 */
export function useMcpServerDelete() {
  const { data: servers = [] } = useMcpServerGet()
  const { data: workspaces = [] } = useWorkspaceGet()
  const { isPending, mutate: updateServers } = useMcpServerUpdate()
  const { mutateAsync: updateWorkspace } = useWorkspaceUpdate()

  function deleteServer(server: McpServer, onDeleted: () => void) {
    updateServers(
      servers.filter((item) => item.name !== server.name),
      {
        onError: (error) => {
          toast(`Failed to delete server: ${error.message}`, "error")
        },
        onSuccess: () => {
          const affected = workspaces.filter(
            (workspace) =>
              workspace.mcpServers?.includes(server.name) ||
              workspace.toolPermissions?.mcp?.[server.name],
          )

          Promise.all(
            affected.map((workspace) =>
              updateWorkspace(
                removeMcpServerFromWorkspace(workspace, server.name),
              ),
            ),
          ).catch((error: unknown) => {
            toast(
              `Failed to update workspaces: ${error instanceof Error ? error.message : String(error)}`,
              "error",
            )
          })
          onDeleted()
        },
      },
    )
  }

  return { deleteServer, isPending }
}
