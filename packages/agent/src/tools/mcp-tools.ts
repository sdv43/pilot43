import type { Chat, McpServer } from "@pilot43/protocol"

import type { ResolvedMcpTool } from "./mcp-client"
import type { Tool, ToolProvider, ToolResult } from "./types"

import { listMcpResourcesToolName, readMcpResourceToolName } from "./const"
import {
  callMcpServerTool,
  listMcpServerResources,
  listMcpServerTools,
  mcpToolPrefix,
  readMcpServerResource,
} from "./mcp-client"

/**
 * Provides the tools of the MCP servers enabled in a chat, plus the
 * `list_mcp_resources` / `read_mcp_resource` tools while at least one server
 * is enabled.
 *
 * A server is enabled when its synthetic toggle entry (`mcp__<serverName>`) is
 * set to `true` in the chat settings. An enabled server exposes all of its
 * tools by default; an explicit per-tool `false` override disables a single
 * MCP tool.
 */
export const mcpToolProvider: ToolProvider = {
  async resolveTools(chat, { store }) {
    const settings = await store.getAppSettings()
    const enabledServers = getEnabledMcpServers(chat, settings.mcpServers ?? [])

    if (enabledServers.length === 0) {
      return []
    }

    // Resolve each enabled server's tools in parallel. Failures are swallowed
    // so one broken server doesn't prevent the others (or the built-in tools)
    // from being advertised to the model.
    const results = await Promise.allSettled(
      enabledServers.map((server) => listMcpServerTools(server)),
    )

    const enabledByToolName = new Map(
      chat.settings.tools.map((tool) => [tool.name, tool.enabled]),
    )
    const serverTools: Tool[] = []

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        return
      }

      for (const tool of result.value) {
        if (enabledByToolName.get(tool.definition.name) !== false) {
          serverTools.push(createMcpServerTool(enabledServers[index], tool))
        }
      }
    })

    return [
      createListMcpResourcesTool(enabledServers),
      createReadMcpResourceTool(enabledServers),
      ...serverTools,
    ]
  },
}

/**
 * Returns the synthetic chat-settings tool key that tracks whether an MCP
 * server is enabled in a chat (`mcp__<serverName>`).
 */
function buildMcpServerKey(serverName: string): string {
  return `${mcpToolPrefix}${serverName}`
}

function getEnabledMcpServers(chat: Chat, servers: McpServer[]) {
  const enabledByName = new Map<string, boolean>()

  for (const entry of chat.settings.tools) {
    if (entry.name.startsWith(mcpToolPrefix)) {
      enabledByName.set(entry.name, entry.enabled)
    }
  }

  return servers.filter(
    (server) => enabledByName.get(buildMcpServerKey(server.name)) === true,
  )
}

function createMcpServerTool(server: McpServer, tool: ResolvedMcpTool): Tool {
  return {
    definition: tool.definition,
    inputSchema: tool.inputSchema,
    group: tool.serverName,
    // MCP tools use arbitrary JSON Schemas (which can include `integer`,
    // `array`, `null`, and union types) that the built-in strict validator
    // doesn't cover. The MCP server validates arguments itself.
    validateArgs: () => undefined,
    execute: (args) => callMcpServerTool(server, tool.toolName, args),
  }
}

function createListMcpResourcesTool(enabledServers: McpServer[]): Tool {
  return {
    definition: {
      id: listMcpResourcesToolName,
      name: listMcpResourcesToolName,
      shortDescription: "List resources exposed by enabled MCP servers.",
      description:
        "List the resources and resource templates exposed by the MCP servers currently enabled for this chat. Use it when you need to discover documents, repository files, datasets, schemas, or other readable server data before making assumptions about what is available. The optional `server` argument limits the lookup to one enabled MCP server by name. Returned entries may include either a concrete `uri` or a `uriTemplate`; pass a concrete URI to `read_mcp_resource` to read the content.",
      hidden: true,
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        server: {
          description:
            "Optional enabled MCP server name to inspect. When omitted, all enabled MCP servers are queried.",
          type: "string",
        },
      },
      required: [],
      type: "object",
    },
    execute: (args) => executeListMcpResourcesTool(args, enabledServers),
  }
}

function createReadMcpResourceTool(enabledServers: McpServer[]): Tool {
  return {
    definition: {
      id: readMcpResourceToolName,
      name: readMcpResourceToolName,
      shortDescription: "Read a resource from an enabled MCP server.",
      description:
        "Read the content of a specific resource URI from an MCP server enabled for this chat. Use it after `list_mcp_resources` or when an MCP tool returns a `resource_link` so you can inspect the actual resource contents instead of guessing. `server` must be the enabled MCP server name and `uri` must be the concrete resource URI to read.",
      hidden: true,
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        server: {
          description: "Enabled MCP server name that owns the resource URI.",
          type: "string",
        },
        uri: {
          description:
            "Concrete resource URI to read, typically discovered via list_mcp_resources or returned by an MCP tool as a resource_link.",
          type: "string",
        },
      },
      required: ["server", "uri"],
      type: "object",
    },
    execute: (args) => executeReadMcpResourceTool(args, enabledServers),
  }
}

async function executeListMcpResourcesTool(
  args: Record<string, unknown>,
  enabledServers: McpServer[],
): Promise<ToolResult> {
  const requestedServerName =
    typeof args.server === "string" && args.server.trim()
      ? args.server.trim()
      : undefined
  const servers = requestedServerName
    ? [
        enabledServers.find((server) => server.name === requestedServerName),
      ].filter((server): server is McpServer => server !== undefined)
    : enabledServers

  if (servers.length === 0) {
    return {
      error: `MCP server \`${requestedServerName}\` is not enabled for this chat.`,
      ok: false,
    }
  }

  const results = await Promise.allSettled(
    servers.map(async (server) => ({
      resources: await listMcpServerResources(server),
      serverName: server.name,
    })),
  )

  const errors: Array<{ error: string; server: string }> = []
  const resources: unknown[] = []

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index]
    const serverName = servers[index]?.name ?? requestedServerName ?? "unknown"

    if (result.status === "rejected") {
      errors.push({
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        server: serverName,
      })
      continue
    }

    resources.push(...result.value.resources)
  }

  if (resources.length === 0 && errors.length > 0) {
    return {
      error:
        requestedServerName !== undefined
          ? `Failed to list resources for MCP server \`${requestedServerName}\`.`
          : "Failed to list resources from the enabled MCP servers.",
      errors,
      ok: false,
    }
  }

  return {
    ...(errors.length > 0 ? { errors, partial: true } : {}),
    ok: true,
    resources,
  }
}

async function executeReadMcpResourceTool(
  args: Record<string, unknown>,
  enabledServers: McpServer[],
): Promise<ToolResult> {
  const serverName =
    typeof args.server === "string" && args.server.trim()
      ? args.server.trim()
      : null
  const uri =
    typeof args.uri === "string" && args.uri.trim() ? args.uri.trim() : null

  if (!serverName) {
    return {
      error: "Parameter `server` must be a non-empty string.",
      ok: false,
    }
  }

  if (!uri) {
    return {
      error: "Parameter `uri` must be a non-empty string.",
      ok: false,
    }
  }

  const server = enabledServers.find((entry) => entry.name === serverName)

  if (!server) {
    return {
      error: `MCP server \`${serverName}\` is not enabled for this chat.`,
      ok: false,
    }
  }

  return await readMcpServerResource(server, uri)
}
