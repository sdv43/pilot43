import { useMcpServerToolsGet } from "../../../../../../queries/mcpServer"
import { PermissionGroup } from "../PermissionGroup"
import { type McpPermissionGroupProps } from "./types"

/** Permission group of one MCP server, listing the tools it exposes. */
export function McpPermissionGroup({
  onChange,
  permissions,
  server,
}: McpPermissionGroupProps) {
  const { data: tools = [], error } = useMcpServerToolsGet(server)

  return (
    <PermissionGroup
      detail={error ? "Tools unavailable" : undefined}
      name={server.name}
      permissions={permissions}
      source={{ server: server.name, type: "mcp" }}
      tools={tools
        .filter((tool) => !tool.hidden)
        .map((tool) => ({
          description: tool.shortDescription ?? tool.description,
          name: tool.name,
        }))}
      onChange={onChange}
    />
  )
}
