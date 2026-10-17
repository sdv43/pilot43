import type {
  ToolPermission,
  ToolPermissionGroup,
  WorkspaceToolPermissions,
} from "./entities"

/** Where a tool comes from: the platform's built-in tools or an MCP server. */
export type ToolSource = { server: string; type: "mcp" } | { type: "builtin" }

/** Built-in tools run without asking unless the workspace says otherwise. */
export const defaultBuiltinToolPermission: ToolPermission = "allow"

/** MCP tools ask for approval unless the workspace says otherwise. */
export const defaultMcpToolPermission: ToolPermission = "ask"

function getStoredGroup(
  permissions: undefined | WorkspaceToolPermissions,
  source: ToolSource,
): ToolPermissionGroup | undefined {
  return source.type === "builtin"
    ? permissions?.builtin
    : permissions?.mcp?.[source.server]
}

/** Permission group of a tool source, with the default level filled in. */
export function getToolPermissionGroup(
  permissions: undefined | WorkspaceToolPermissions,
  source: ToolSource,
): Required<ToolPermissionGroup> {
  const group = getStoredGroup(permissions, source)

  return {
    level:
      group?.level ??
      (source.type === "builtin"
        ? defaultBuiltinToolPermission
        : defaultMcpToolPermission),
    tools: group?.tools ?? {},
  }
}

/** Effective permission of one tool: its override, else its group level. */
export function resolveToolPermission(
  permissions: undefined | WorkspaceToolPermissions,
  source: ToolSource,
  toolName: string,
): ToolPermission {
  const group = getToolPermissionGroup(permissions, source)

  return group.tools[toolName] ?? group.level
}

function withGroup(
  permissions: undefined | WorkspaceToolPermissions,
  source: ToolSource,
  group: ToolPermissionGroup,
): WorkspaceToolPermissions {
  if (source.type === "builtin") {
    return { ...permissions, builtin: group }
  }

  return {
    ...permissions,
    mcp: { ...permissions?.mcp, [source.server]: group },
  }
}

/** Sets a group's level. Its per-tool overrides are reset. */
export function setToolPermissionGroupLevel(
  permissions: undefined | WorkspaceToolPermissions,
  source: ToolSource,
  level: ToolPermission,
): WorkspaceToolPermissions {
  return withGroup(permissions, source, { level, tools: {} })
}

/**
 * Sets one tool's permission. A value equal to the group level removes the
 * override instead of storing it.
 */
export function setToolPermission(
  permissions: undefined | WorkspaceToolPermissions,
  source: ToolSource,
  toolName: string,
  value: ToolPermission,
): WorkspaceToolPermissions {
  const group = getToolPermissionGroup(permissions, source)
  const { [toolName]: _previous, ...tools } = group.tools

  return withGroup(permissions, source, {
    level: group.level,
    tools: value === group.level ? tools : { ...tools, [toolName]: value },
  })
}

/**
 * Updates a workspace's MCP allowlist and permissions after an MCP server was
 * renamed, so its settings follow the server.
 */
export function renameMcpServerInWorkspace<
  W extends {
    mcpServers?: string[]
    toolPermissions?: WorkspaceToolPermissions
  },
>(workspace: W, oldName: string, newName: string): W {
  if (oldName === newName) {
    return workspace
  }

  const group = workspace.toolPermissions?.mcp?.[oldName]
  const { [oldName]: _old, ...otherGroups } =
    workspace.toolPermissions?.mcp ?? {}
  const oldPrefix = `mcp__${oldName}__`
  const renamedGroup = group && {
    level: group.level,
    tools: Object.fromEntries(
      Object.entries(group.tools ?? {}).map(([tool, value]) => [
        tool.startsWith(oldPrefix)
          ? `mcp__${newName}__${tool.slice(oldPrefix.length)}`
          : tool,
        value,
      ]),
    ),
  }

  return {
    ...workspace,
    ...(workspace.mcpServers
      ? {
          mcpServers: workspace.mcpServers.map((name) =>
            name === oldName ? newName : name,
          ),
        }
      : {}),
    ...(workspace.toolPermissions
      ? {
          toolPermissions: {
            ...workspace.toolPermissions,
            mcp: renamedGroup
              ? { ...otherGroups, [newName]: renamedGroup }
              : otherGroups,
          },
        }
      : {}),
  }
}
