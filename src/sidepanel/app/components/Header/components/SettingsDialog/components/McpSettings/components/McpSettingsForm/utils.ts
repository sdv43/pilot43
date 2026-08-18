import type { McpServer } from "@/shared/api"

import type { McpServersDocument } from "./types"

/**
 * Converts the internal {@link McpServer} list into the `{servers: {...}}`
 * document shown in the JSON editor. Additional server fields are preserved,
 * with the server name becoming the object key.
 */
export function serversToDocument(servers: McpServer[]): McpServersDocument {
  const map: McpServersDocument["servers"] = {}

  for (const server of servers) {
    const { name, ...serverConfig } = server
    map[name] = serverConfig
  }

  return {
    servers: map,
  }
}

/**
 * Converts the `{servers: {...}}` editor document back into the internal
 * {@link McpServer} list. Throws when the document is malformed.
 */
export function documentToServers(doc: unknown): McpServer[] {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("MCP config must be an object with a `servers` map.")
  }

  const servers = (doc as { servers?: unknown }).servers
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    throw new Error("MCP config `servers` must be an object.")
  }

  return Object.entries(servers as Record<string, unknown>).map(
    ([name, config]) => {
      if (name.trim() === "") {
        throw new Error("MCP server name is required.")
      }

      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error(`MCP server "${name}" must be an object.`)
      }

      const { type, url, ...extraConfig } = config as Record<string, unknown>

      if (typeof url !== "string" || url.trim() === "") {
        throw new Error(`MCP server "${name}" is missing a "url".`)
      }

      return {
        ...extraConfig,
        name,
        type: (type ?? "http") as "http",
        url,
      }
    },
  )
}
