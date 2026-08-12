import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

import type { McpServer, ModelTool } from "@/shared/api"

import type { ToolInputSchema } from "./types"

/**
 * Prefix used to namespace MCP tools so they never collide with the built-in
 * tools. The full tool name is `mcp__<serverName>__<toolName>`.
 */
export const mcpToolPrefix = "mcp__"

/**
 * Builds the namespaced tool name exposed to the model for an MCP tool.
 */
function buildMcpToolName(serverName: string, toolName: string): string {
  return `${mcpToolPrefix}${serverName}__${toolName}`
}

/**
 * Splits a namespaced MCP tool name back into its server and tool parts.
 * Returns `null` when the name is not a namespaced MCP tool.
 */
export function parseMcpToolName(
  fullName: string,
): null | { serverName: string; toolName: string } {
  if (!fullName.startsWith(mcpToolPrefix)) {
    return null
  }
  const rest = fullName.slice(mcpToolPrefix.length)
  const separatorIndex = rest.indexOf("__")
  if (separatorIndex <= 0 || separatorIndex >= rest.length - 2) {
    return null
  }
  const serverName = rest.slice(0, separatorIndex)
  const toolName = rest.slice(separatorIndex + 2)
  if (!serverName || !toolName) {
    return null
  }
  return { serverName, toolName }
}

/**
 * Coerces an MCP tool's JSON Schema `inputSchema` into the
 * {@link ToolInputSchema} shape used by the rest of the tool runtime. MCP
 * schemas are arbitrary JSON Schema objects; we keep the `properties` and
 * `required` fields and default `additionalProperties` to `false` to match the
 * strict validation the built-in tools use.
 */
function coerceInputSchema(raw: unknown): ToolInputSchema {
  const schema =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  const properties =
    schema.properties && typeof schema.properties === "object"
      ? (schema.properties as ToolInputSchema["properties"])
      : {}

  const required = Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === "string")
    : []

  return {
    type: "object",
    additionalProperties: Boolean(schema.additionalProperties),
    properties,
    required,
  }
}

/**
 * A single MCP tool resolved from a server, ready to be exposed to the model
 * and rendered in the tools UI.
 */
export interface ResolvedMcpTool {
  serverName: string
  toolName: string
  definition: ModelTool
  inputSchema: ToolInputSchema
}

/**
 * Connects to an MCP server over the streamable-HTTP transport, lists its
 * tools, and returns them as {@link ResolvedMcpTool} entries. Always closes
 * the connection before returning (or throwing).
 *
 * Throws a descriptive `Error` when the server is unreachable, returns an
 * error response, or exposes no tools.
 */
export async function listMcpServerTools(
  server: McpServer,
): Promise<ResolvedMcpTool[]> {
  let url: URL
  try {
    url = new URL(server.url)
  } catch {
    throw new Error(`Invalid MCP server URL: ${server.url}`)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https MCP server URLs are supported.")
  }

  const requestInit: RequestInit = {}
  if (server.headers) {
    requestInit.headers = { ...server.headers }
  }

  const transport = new StreamableHTTPClientTransport(url, { requestInit })
  const client = new Client(
    { name: "pilot43", version: "0.0.0" },
    { capabilities: {} },
  )

  try {
    await client.connect(transport)
    const response = await client.listTools()
    const tools = response.tools ?? []

    if (tools.length === 0) {
      return []
    }

    return tools.map((tool) => {
      const fullName = buildMcpToolName(server.name, tool.name)
      const description =
        typeof tool.description === "string" && tool.description.trim()
          ? tool.description
          : `MCP tool "${tool.name}" from server "${server.name}".`

      const definition: ModelTool = {
        id: fullName,
        name: fullName,
        description,
        shortDescription:
          typeof tool.annotations?.title === "string" && tool.annotations.title
            ? tool.annotations.title
            : tool.name,
        group: server.name,
        defaultEnabled: false,
      }

      return {
        serverName: server.name,
        toolName: tool.name,
        definition,
        inputSchema: coerceInputSchema(tool.inputSchema),
      }
    })
  } finally {
    await client.close().catch(() => {})
  }
}

/**
 * Calls a single tool on an MCP server and returns its result as a plain
 * object suitable for persisting as a tool result. Text content parts are
 * concatenated into a single `text` string; non-text parts are summarized so
 * the model still receives a meaningful, JSON-serializable result.
 */
export async function callMcpServerTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let url: URL
  try {
    url = new URL(server.url)
  } catch {
    throw new Error(`Invalid MCP server URL: ${server.url}`)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https MCP server URLs are supported.")
  }

  const requestInit: RequestInit = {}
  if (server.headers) {
    requestInit.headers = { ...server.headers }
  }

  const transport = new StreamableHTTPClientTransport(url, { requestInit })
  const client = new Client(
    { name: "pilot43", version: "0.0.0" },
    { capabilities: {} },
  )

  try {
    await client.connect(transport)
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    })

    const content = Array.isArray(result.content) ? result.content : []
    const textParts: string[] = []
    const otherParts: Record<string, unknown>[] = []

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue
      }
      const entry = part as { type?: unknown; text?: unknown }
      if (entry.type === "text" && typeof entry.text === "string") {
        textParts.push(entry.text)
      } else {
        otherParts.push(part as Record<string, unknown>)
      }
    }

    return {
      ok: !result.isError,
      text: textParts.join("\n").trim() || undefined,
      ...(otherParts.length > 0 ? { parts: otherParts } : {}),
      ...(result.isError ? { error: "MCP server reported a tool error." } : {}),
    }
  } finally {
    await client.close().catch(() => {})
  }
}
