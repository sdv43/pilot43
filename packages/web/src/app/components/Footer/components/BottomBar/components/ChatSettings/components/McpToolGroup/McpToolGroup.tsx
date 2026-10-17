import { resolveToolPermission } from "@pilot43/protocol"
import { useEffect } from "react"

import { useMcpServerToolsGet } from "../../../../../../../../../queries/mcpServer"
import { parseToolName } from "../../../../../../../../../shared/tool-call"
import {
  buildMcpServerToggleKey,
  buildNextMcpGroupToolsState,
  buildNextToolState,
  hydrateMcpGroupToolsState,
} from "../../../../../../../../../shared/tool-state"
import { isToolEnabled } from "../../utils"
import { ToolGroup } from "../ToolGroup"
import { type McpToolGroupProps } from "./types"

/** Tools of one MCP server in the tools picker. */
export function McpToolGroup({
  onChange,
  permissions,
  server,
  toolsState,
}: McpToolGroupProps) {
  const {
    data: serverTools = [],
    error,
    isLoading,
    refetch,
  } = useMcpServerToolsGet(server)
  const isEnabled = toolsState[buildMcpServerToggleKey(server.name)] ?? false
  const tools = serverTools.filter((tool) => !tool.hidden)

  // An enabled server starts with all of its tools on.
  useEffect(() => {
    if (!isEnabled || tools.length === 0) {
      return
    }

    const next = hydrateMcpGroupToolsState(toolsState, server.name, tools)

    if (next !== toolsState) {
      onChange(next)
    }
  }, [isEnabled, onChange, server.name, tools, toolsState])

  return (
    <ToolGroup
      enabled={isEnabled}
      error={error ? error.message : undefined}
      isLoading={isLoading}
      name={server.name}
      tools={tools.map((tool) => ({
        asksFirst:
          resolveToolPermission(
            permissions,
            { server: server.name, type: "mcp" },
            tool.name,
          ) === "ask",
        description: tool.shortDescription ?? tool.description,
        enabled: isEnabled && isToolEnabled(tool, toolsState),
        label: parseToolName(tool.name).tool,
        name: tool.name,
      }))}
      onReconnect={() => void refetch()}
      onToggle={(enabled) =>
        onChange(
          buildNextMcpGroupToolsState(toolsState, server.name, tools, enabled),
        )
      }
      onToolToggle={(toolName, enabled) =>
        onChange(
          buildNextToolState(
            enabled
              ? { ...toolsState, [buildMcpServerToggleKey(server.name)]: true }
              : toolsState,
            toolName,
            enabled,
          ),
        )
      }
    />
  )
}
