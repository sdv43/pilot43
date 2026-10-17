import type { ToolSource, WorkspaceToolPermissions } from "@pilot43/protocol"

export interface PermissionGroupTool {
  description?: string
  /** Full tool name the permission is stored under. */
  name: string
}

export interface PermissionGroupProps {
  /** Shown instead of the tool count, e.g. when the server is unreachable. */
  detail?: string
  name: string
  onChange: (permissions: WorkspaceToolPermissions) => void
  permissions: WorkspaceToolPermissions
  source: ToolSource
  tools: PermissionGroupTool[]
}
