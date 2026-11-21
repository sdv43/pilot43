import { ServerIcon } from "lucide-react"

import { useMcpServerToolsGet } from "../../../../../../queries/mcpServer"
import { BrandLogo, getUrlBrand } from "../../../../../components/BrandLogo"
import { PermissionGroup } from "../PermissionGroup"
import { type McpPermissionGroupProps } from "./types"

/** One MCP server: on/off in the workspace, its permission and its tools. */
export function McpPermissionGroup({
  enabled,
  onChange,
  onEnabledChange,
  permissions,
  server,
}: McpPermissionGroupProps) {
  const { data: tools = [], error } = useMcpServerToolsGet(server)

  return (
    <PermissionGroup
      detail={error ? `Tools unavailable · ${error.message}` : undefined}
      enabled={enabled}
      logo={<BrandLogo brand={getUrlBrand(server.url)} fallback={ServerIcon} />}
      name={server.name}
      permissions={permissions}
      source={{ server: server.name, type: "mcp" }}
      switchTestId={`workspace-mcp-${server.name}`}
      tools={tools
        .filter((tool) => !tool.hidden)
        .map((tool) => ({
          description: tool.shortDescription ?? tool.description,
          name: tool.name,
        }))}
      onChange={onChange}
      onEnabledChange={onEnabledChange}
    />
  )
}
