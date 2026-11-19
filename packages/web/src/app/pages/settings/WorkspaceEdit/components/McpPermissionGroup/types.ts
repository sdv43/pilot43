import type { McpServer, WorkspaceToolPermissions } from "@pilot43/protocol"

export interface McpPermissionGroupProps {
  /** Whether the server is on in this workspace. */
  enabled: boolean
  onChange: (permissions: WorkspaceToolPermissions) => void
  onEnabledChange: (enabled: boolean) => void
  permissions: WorkspaceToolPermissions
  server: McpServer
}
