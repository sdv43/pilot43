import type {
  ModelTool,
  ToolSource,
  WorkspaceToolPermissions,
} from "@pilot43/protocol"

import {
  getToolPermissionGroup,
  resolveToolPermission,
} from "@pilot43/protocol"

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

/**
 * Whether a whole tool source is disabled in the workspace: its group is
 * disabled and no tool is switched back on.
 */
export function isToolSourceDisabled(
  permissions: undefined | WorkspaceToolPermissions,
  source: ToolSource,
) {
  const group = getToolPermissionGroup(permissions, source)

  return (
    group.level === "disabled" &&
    Object.values(group.tools).every((value) => value === "disabled")
  )
}

/**
 * Tools the workspace disables (hidden from this popover), counted for the
 * footer note. Only sources that are offered at all are counted.
 */
export function countDisabledTools(
  permissions: undefined | WorkspaceToolPermissions,
  builtinTools: Pick<ModelTool, "hidden" | "name">[],
  toolsByServer: Record<string, Pick<ModelTool, "hidden" | "name">[]>,
) {
  const count = (
    source: ToolSource,
    tools: Pick<ModelTool, "hidden" | "name">[],
  ) =>
    tools.filter(
      (tool) =>
        !tool.hidden &&
        resolveToolPermission(permissions, source, tool.name) === "disabled",
    ).length

  return (
    count({ type: "builtin" }, builtinTools) +
    Object.entries(toolsByServer).reduce(
      (sum, [server, tools]) => sum + count({ server, type: "mcp" }, tools),
      0,
    )
  )
}
