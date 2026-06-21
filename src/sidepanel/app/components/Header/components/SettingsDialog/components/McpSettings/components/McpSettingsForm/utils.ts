import type { McpServer } from "@/shared/api"

import type { McpServersDocument } from "./types"

/**
 * Converts the internal {@link McpServer} list into the `{servers: {...}}`
 * document shown in the JSON editor.
 */
export function serversToDocument(servers: McpServer[]): McpServersDocument {
  const map: McpServersDocument["servers"] = {}

  for (const server of servers) {
    map[server.name] = {
      type: server.type,
      url: server.url,
      ...(server.headers ? { headers: server.headers } : {}),
    }
  }

  return { servers: map }
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
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error(`MCP server "${name}" must be an object.`)
      }

      const cfg = config as {
        type?: unknown
        url?: unknown
        headers?: unknown
      }

      return {
        name,
        type: (cfg.type ?? "http") as "http",
        url: cfg.url as string,
        ...(cfg.headers
          ? { headers: cfg.headers as Record<string, string> }
          : {}),
      }
    },
  )
}
