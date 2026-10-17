import type { McpServer, Workspace } from "@pilot43/protocol"

import type { WorkspaceDraft } from "./types"

export function createWorkspaceDraft(
  workspace: undefined | Workspace,
  servers: McpServer[],
): WorkspaceDraft {
  return {
    color: workspace?.color ?? "violet",
    // Workspaces without the setting allow every server.
    mcpServers: workspace?.mcpServers ?? servers.map((server) => server.name),
    name: workspace?.name ?? "",
    systemPrompt: workspace?.systemPrompt ?? "",
    toolPermissions: workspace?.toolPermissions ?? {},
  }
}

/** Strips the `mcp__<server>__` prefix from an MCP tool name. */
export function getToolDisplayName(toolName: string, server?: string) {
  const prefix = server ? `mcp__${server}__` : ""

  return prefix && toolName.startsWith(prefix)
    ? toolName.slice(prefix.length)
    : toolName
}
