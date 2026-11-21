export interface ToolGroupTool {
  asksFirst: boolean
  description?: string
  enabled: boolean
  label: string
  name: string
}

import type { ReactNode } from "react"

export interface ToolGroupProps {
  /** Shown instead of the tool count, e.g. a connection error. */
  error?: string
  enabled: boolean
  isLoading?: boolean
  /** Logo tile of the source (Built-in, an MCP server). */
  logo: ReactNode
  name: string
  onReconnect?: () => void
  onToggle: (enabled: boolean) => void
  onToolToggle: (toolName: string, enabled: boolean) => void
  tools: ToolGroupTool[]
}
