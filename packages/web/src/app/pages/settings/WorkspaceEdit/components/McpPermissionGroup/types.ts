import type { McpServer, WorkspaceToolPermissions } from "@pilot43/protocol"

export interface McpPermissionGroupProps {
  onChange: (permissions: WorkspaceToolPermissions) => void
  permissions: WorkspaceToolPermissions
  server: McpServer
}
