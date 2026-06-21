import type { McpServer } from "@/shared/api"

import { getAppSettings, saveAppSettings } from "../storage"
import { listMcpServerTools } from "../tools/mcp-client"

/**
 * Returns the list of configured MCP servers from app settings.
 */
export async function handleMcpServerGet(): Promise<McpServer[]> {
  const settings = await getAppSettings()
  return settings.mcpServers ?? []
}

/**
 * Replaces the full list of MCP servers. Validates that names are unique and
 * URLs are absolute http(s) URLs before persisting.
 */
export async function handleMcpServerUpdate(
  servers: McpServer[],
): Promise<McpServer[]> {
  const normalized = normalizeServers(servers)
  const settings = await getAppSettings()
  await saveAppSettings({ ...settings, mcpServers: normalized })
  return normalized
}

/**
 * Connects to an MCP server, lists its tools, and returns them as model tool
 * definitions. Used by the tools UI to populate a server's group when the user
 * enables it. Throws when the server is unreachable or returns an error so the
 * UI can surface the failure message.
 */
export async function handleMcpServerToolsGet(server: McpServer) {
  const normalized = normalizeServer(server)
  const tools = await listMcpServerTools(normalized)
  return tools.map((tool) => tool.definition)
}

/**
 * Validates and normalizes a single MCP server definition. Throws on invalid
 * input so callers can surface a meaningful error.
 */
function normalizeServer(server: McpServer): McpServer {
  if (!server || typeof server !== "object") {
    throw new Error("MCP server must be an object.")
  }

  const name = server.name?.trim()
  if (!name) {
    throw new Error("MCP server name is required.")
  }
  if (!/^[A-Za-z0-9_.:-]+$/.test(name)) {
    throw new Error(
      `MCP server name "${name}" must only contain letters, numbers, and . : _ -.`,
    )
  }

  // Only the HTTP transport is supported in the browser context.
  const type = server.type
  if (type !== "http") {
    throw new Error(
      `MCP server "${name}" must use the "http" transport (got "${String(type ?? "missing")}").`,
    )
  }

  const url = server.url?.trim()
  if (!url) {
    throw new Error(`MCP server "${name}" is missing a URL.`)
  }
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`MCP server "${name}" has an invalid URL: ${url}`)
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `MCP server "${name}" must use an http or https URL (only HTTP transport is supported).`,
    )
  }

  let headers: Record<string, string> | undefined
  if (server.headers !== undefined) {
    if (
      typeof server.headers !== "object" ||
      server.headers === null ||
      Array.isArray(server.headers)
    ) {
      throw new Error(`MCP server "${name}" headers must be an object.`)
    }
    const entries = Object.entries(server.headers)
    if (entries.length > 0) {
      headers = {}
      for (const [key, value] of entries) {
        if (typeof value !== "string") {
          throw new Error(
            `MCP server "${name}" header "${key}" must be a string.`,
          )
        }
        headers[key] = value
      }
    }
  }

  return {
    name,
    type: "http",
    url: parsedUrl.href,
    ...(headers ? { headers } : {}),
  }
}

/**
 * Validates and normalizes a list of MCP servers, enforcing unique names.
 */
function normalizeServers(servers: McpServer[]): McpServer[] {
  if (!Array.isArray(servers)) {
    throw new Error("MCP servers must be an array.")
  }

  const normalized = servers.map((server) => normalizeServer(server))

  const seen = new Set<string>()
  for (const server of normalized) {
    if (seen.has(server.name)) {
      throw new Error(`Duplicate MCP server name: "${server.name}".`)
    }
    seen.add(server.name)
  }

  return normalized
}
