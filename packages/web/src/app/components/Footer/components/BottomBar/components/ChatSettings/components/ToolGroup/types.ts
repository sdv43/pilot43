export interface ToolGroupTool {
  asksFirst: boolean
  description?: string
  enabled: boolean
  label: string
  name: string
}

export interface ToolGroupProps {
  /** Shown instead of the tool count, e.g. a connection error. */
  error?: string
  enabled: boolean
  isLoading?: boolean
  name: string
  onReconnect?: () => void
  onToggle: (enabled: boolean) => void
  onToolToggle: (toolName: string, enabled: boolean) => void
  tools: ToolGroupTool[]
}
