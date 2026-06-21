import type { ChatSettings, McpServer, ModelTool } from "@/shared/api/entities"

export const mcpServerTogglePrefix = "mcp__"

export function buildMcpServerToggleKey(serverName: string): string {
  return `${mcpServerTogglePrefix}${serverName}`
}

export function getDefaultToolEnabled(
  tool: Pick<ModelTool, "defaultEnabled">,
): boolean {
  return tool.defaultEnabled ?? true
}

export function buildDefaultToolsState(
  tools: ModelTool[],
): Record<string, boolean> {
  const state: Record<string, boolean> = {}

  for (const tool of tools) {
    state[tool.name] = getDefaultToolEnabled(tool)
  }

  return state
}

export function mergeToolsStateWithDefaults(
  tools: ModelTool[],
  toolsState: Record<string, boolean>,
): Record<string, boolean> {
  return {
    ...buildDefaultToolsState(tools),
    ...toolsState,
  }
}

export function buildChatToolsState(
  tools: ModelTool[],
  chatSettings: ChatSettings | undefined,
): Record<string, boolean> {
  const state = buildDefaultToolsState(tools)

  for (const entry of chatSettings?.tools ?? []) {
    state[entry.name] = entry.enabled
  }

  return state
}

export function buildChatSettingsFromToolsState(
  toolsState: Record<string, boolean>,
): ChatSettings {
  return {
    tools: Object.entries(toolsState)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, enabled]) => ({ enabled, name })),
  }
}

export function buildMcpEnabledByName(
  mcpServers: McpServer[],
  toolsState: Record<string, boolean>,
): Map<string, boolean> {
  const map = new Map<string, boolean>()

  for (const server of mcpServers) {
    map.set(
      server.name,
      toolsState[buildMcpServerToggleKey(server.name)] ?? false,
    )
  }

  return map
}

export function buildNextToolState(
  toolsState: Record<string, boolean>,
  toolName: string,
  isEnabled: boolean,
): Record<string, boolean> {
  return {
    ...toolsState,
    [toolName]: isEnabled,
  }
}

export function buildNextMcpGroupToolsState(
  toolsState: Record<string, boolean>,
  serverName: string,
  mcpTools: Pick<ModelTool, "name">[],
  isEnabled: boolean,
): Record<string, boolean> {
  const next = { ...toolsState }

  next[buildMcpServerToggleKey(serverName)] = isEnabled

  for (const tool of mcpTools) {
    next[tool.name] = isEnabled
  }

  return next
}

export function hydrateMcpGroupToolsState(
  toolsState: Record<string, boolean>,
  serverName: string,
  mcpTools: Pick<ModelTool, "name">[],
): Record<string, boolean> {
  let next: null | Record<string, boolean> = null
  const serverToggleKey = buildMcpServerToggleKey(serverName)

  if (toolsState[serverToggleKey] !== true) {
    next = {
      ...toolsState,
      [serverToggleKey]: true,
    }
  }

  for (const tool of mcpTools) {
    const target = next ?? toolsState
    if (target[tool.name] !== undefined) {
      continue
    }

    if (!next) {
      next = { ...toolsState }
    }

    next[tool.name] = true
  }

  return next ?? toolsState
}
