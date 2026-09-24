import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

import type { McpServer, ModelTool } from "@/shared/api"

import type { ToolInputSchema } from "./types"

import {
  maxMcpResourceCharacters,
  maxMcpResourcePages,
  maxMcpResourcesListed,
} from "./const"

/**
 * Prefix used to namespace MCP tools so they never collide with the built-in
 * tools. The full tool name is `mcp__<serverName>__<toolName>`.
 */
export const mcpToolPrefix = "mcp__"

type McpClient = InstanceType<typeof Client>

interface TruncatedText {
  truncated: boolean
  value: string
}

/**
 * Builds the namespaced tool name exposed to the model for an MCP tool.
 */
function buildMcpToolName(serverName: string, toolName: string): string {
  return `${mcpToolPrefix}${serverName}__${toolName}`
}

function validateMcpServerUrl(server: McpServer): URL {
  let url: URL

  try {
    url = new URL(server.url)
  } catch {
    throw new Error(`Invalid MCP server URL: ${server.url}`)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https MCP server URLs are supported.")
  }

  return url
}

async function withMcpClient<T>(
  server: McpServer,
  run: (client: McpClient) => Promise<T>,
): Promise<T> {
  const url = validateMcpServerUrl(server)
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
    return await run(client)
  } finally {
    await client.close().catch(() => {})
  }
}

function hasMcpResourceCapability(client: McpClient): boolean {
  return client.getServerCapabilities()?.resources !== undefined
}

function truncateResourceText(value: string): TruncatedText {
  if (value.length <= maxMcpResourceCharacters) {
    return { truncated: false, value }
  }

  return {
    truncated: true,
    value: value.slice(0, maxMcpResourceCharacters),
  }
}

function buildPaginationParams(cursor?: string) {
  return cursor ? { cursor } : undefined
}

type ListedMcpResource = {
  description?: string
  mimeType?: string
  name: string
  title?: string
  uri: string
}

type ListedMcpResourceTemplate = {
  description?: string
  mimeType?: string
  name: string
  title?: string
  uriTemplate: string
}

async function collectListedResources(client: McpClient): Promise<{
  resources: ListedMcpResource[]
  truncated: boolean
}> {
  const resources: ListedMcpResource[] = []
  let cursor: string | undefined
  let pageCount = 0

  while (pageCount < maxMcpResourcePages) {
    const response = await client.listResources(buildPaginationParams(cursor))

    for (const resource of response.resources ?? []) {
      if (resources.length >= maxMcpResourcesListed) {
        return { resources, truncated: true }
      }

      resources.push({
        description: resource.description,
        mimeType: resource.mimeType,
        name: resource.name,
        title: resource.title,
        uri: resource.uri,
      })
    }

    if (!response.nextCursor) {
      return { resources, truncated: false }
    }

    cursor = response.nextCursor
    pageCount += 1
  }

  return { resources, truncated: true }
}

async function collectListedResourceTemplates(client: McpClient): Promise<{
  templates: ListedMcpResourceTemplate[]
  truncated: boolean
}> {
  const templates: ListedMcpResourceTemplate[] = []
  let cursor: string | undefined
  let pageCount = 0

  while (pageCount < maxMcpResourcePages) {
    const response = await client.listResourceTemplates(
      buildPaginationParams(cursor),
    )

    for (const template of response.resourceTemplates ?? []) {
      if (templates.length >= maxMcpResourcesListed) {
        return { templates, truncated: true }
      }

      templates.push({
        description: template.description,
        mimeType: template.mimeType,
        name: template.name,
        title: template.title,
        uriTemplate: template.uriTemplate,
      })
    }

    if (!response.nextCursor) {
      return { templates, truncated: false }
    }

    cursor = response.nextCursor
    pageCount += 1
  }

  return { templates, truncated: true }
}

function normalizeMcpResourceContent(
  resource:
    | { blob: string; mimeType?: string; uri: string }
    | { mimeType?: string; text: string; uri: string },
): Record<string, unknown> {
  if ("text" in resource) {
    const { truncated, value } = truncateResourceText(resource.text)

    return {
      mimeType: resource.mimeType,
      text: value,
      truncated,
      type: "text",
      uri: resource.uri,
    }
  }

  const { truncated, value } = truncateResourceText(resource.blob)

  return {
    blob: value,
    encoding: "base64",
    mimeType: resource.mimeType,
    truncated,
    type: "blob",
    uri: resource.uri,
  }
}

function normalizeMcpToolContentPart(
  part: Record<string, unknown>,
): Record<string, unknown> {
  if (
    part.type === "resource" &&
    part.resource &&
    typeof part.resource === "object"
  ) {
    return {
      resource: normalizeMcpResourceContent(
        part.resource as
          | { blob: string; mimeType?: string; uri: string }
          | { mimeType?: string; text: string; uri: string },
      ),
      type: "resource",
    }
  }

  if (part.type === "resource_link") {
    return {
      description:
        typeof part.description === "string" ? part.description : undefined,
      mimeType: typeof part.mimeType === "string" ? part.mimeType : undefined,
      name: typeof part.name === "string" ? part.name : undefined,
      title: typeof part.title === "string" ? part.title : undefined,
      type: "resource_link",
      uri: typeof part.uri === "string" ? part.uri : undefined,
    }
  }

  return part
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

export interface ResolvedMcpResource {
  description?: string
  kind: "resource" | "resource_template"
  mimeType?: string
  name: string
  serverName: string
  title?: string
  uri?: string
  uriTemplate?: string
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
  return await withMcpClient(server, async (client) => {
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
  })
}

/**
 * Lists MCP resources and resource templates exposed by a server.
 */
export async function listMcpServerResources(
  server: McpServer,
): Promise<ResolvedMcpResource[]> {
  return await withMcpClient(server, async (client) => {
    if (!hasMcpResourceCapability(client)) {
      return []
    }

    const [resourcesResult, templatesResult] = await Promise.allSettled([
      collectListedResources(client),
      collectListedResourceTemplates(client),
    ])

    if (
      resourcesResult.status === "rejected" &&
      templatesResult.status === "rejected"
    ) {
      throw resourcesResult.reason instanceof Error
        ? resourcesResult.reason
        : new Error(String(resourcesResult.reason))
    }

    const resources =
      resourcesResult.status === "fulfilled"
        ? resourcesResult.value.resources.map(
            (resource): ResolvedMcpResource => ({
              description: resource.description,
              kind: "resource",
              mimeType: resource.mimeType,
              name: resource.name,
              serverName: server.name,
              title: resource.title,
              uri: resource.uri,
            }),
          )
        : []

    const templates =
      templatesResult.status === "fulfilled"
        ? templatesResult.value.templates.map(
            (template): ResolvedMcpResource => ({
              description: template.description,
              kind: "resource_template",
              mimeType: template.mimeType,
              name: template.name,
              serverName: server.name,
              title: template.title,
              uriTemplate: template.uriTemplate,
            }),
          )
        : []

    return [...resources, ...templates].slice(0, maxMcpResourcesListed)
  })
}

/**
 * Reads a single MCP resource by URI and normalizes it into a compact,
 * JSON-serializable payload for the tool runtime.
 */
export async function readMcpServerResource(
  server: McpServer,
  uri: string,
): Promise<Record<string, unknown>> {
  return await withMcpClient(server, async (client) => {
    if (!hasMcpResourceCapability(client)) {
      throw new Error(
        `MCP server \`${server.name}\` does not expose resources.`,
      )
    }

    const result = await client.readResource({ uri })
    const contents = Array.isArray(result.contents) ? result.contents : []
    const normalizedContents = contents.map(normalizeMcpResourceContent)
    const text = normalizedContents
      .map((entry) =>
        entry.type === "text" && typeof entry.text === "string"
          ? entry.text
          : undefined,
      )
      .filter((entry): entry is string => typeof entry === "string")
      .join("\n\n")

    return {
      contents: normalizedContents,
      ok: true,
      server: server.name,
      ...(text ? { text } : {}),
      uri,
    }
  })
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
  return await withMcpClient(server, async (client) => {
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    })

    const content =
      "content" in result && Array.isArray(result.content) ? result.content : []
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
        otherParts.push(
          normalizeMcpToolContentPart(part as Record<string, unknown>),
        )
      }
    }

    return {
      ok: !result.isError,
      text: textParts.join("\n").trim() || undefined,
      ...(otherParts.length > 0 ? { parts: otherParts } : {}),
      ...("structuredContent" in result &&
      result.structuredContent !== undefined
        ? { structuredContent: result.structuredContent }
        : {}),
      ...(result.isError ? { error: "MCP server reported a tool error." } : {}),
    }
  })
}
