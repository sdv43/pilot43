import { useId } from "react"

import { useMcpServerToolsGet } from "../../../../../../queries/mcpServer"
import { SettingsRow } from "../../../../../components/SettingsRow"
import { Toggle } from "../../../../../components/Toggle"
import { formatCount } from "../../../utils"
import { type McpServerToggleRowProps } from "./types"

/** Allows or hides an MCP server in the workspace. */
export function McpServerToggleRow({
  enabled,
  onToggle,
  server,
}: McpServerToggleRowProps) {
  const id = useId()
  const { data: tools, error, isLoading } = useMcpServerToolsGet(server)
  const description = isLoading
    ? "Connecting…"
    : error
      ? error.message
      : `${formatCount(tools?.filter((tool) => !tool.hidden).length ?? 0, "tool")} · connected`

  return (
    <SettingsRow
      control={
        <Toggle
          checked={enabled}
          data-testid={`workspace-mcp-${server.name}`}
          id={id}
          onChange={(event) => onToggle(event.target.checked)}
        />
      }
      description={description}
      htmlFor={id}
      title={server.name}
    />
  )
}
