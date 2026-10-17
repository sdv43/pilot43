import type { ModelTool } from "@pilot43/protocol"

/** Whether a tool is on: its per-chat override, else its default. */
export function isToolEnabled(
  tool: Pick<ModelTool, "defaultEnabled" | "name"> | undefined,
  toolsState: Record<string, boolean>,
): boolean {
  if (!tool) {
    return false
  }

  return toolsState[tool.name] ?? tool.defaultEnabled ?? true
}

/** Label of the tools chip: enabled MCP servers, else "Tools". */
export function getToolsChipLabel(enabledServers: number) {
  if (enabledServers === 0) {
    return "Tools"
  }

  return enabledServers === 1 ? "1 server" : `${enabledServers} servers`
}
