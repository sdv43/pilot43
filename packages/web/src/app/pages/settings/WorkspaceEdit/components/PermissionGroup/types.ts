import type { ToolSource, WorkspaceToolPermissions } from "@pilot43/protocol"
import type { ReactNode } from "react"

export interface PermissionGroupTool {
  description?: string
  /** Full tool name the permission is stored under. */
  name: string
}

export interface PermissionGroupProps {
  /** Shown instead of the tool count, e.g. when the server is unreachable. */
  detail?: string
  /**
   * MCP servers only: whether the server is on in this workspace. Off hides
   * its permission and its tools from chats.
   */
  enabled?: boolean
  logo?: ReactNode
  onEnabledChange?: (enabled: boolean) => void
  /** Test id of the on/off switch. */
  switchTestId?: string
  name: string
  onChange: (permissions: WorkspaceToolPermissions) => void
  permissions: WorkspaceToolPermissions
  source: ToolSource
  tools: PermissionGroupTool[]
}
