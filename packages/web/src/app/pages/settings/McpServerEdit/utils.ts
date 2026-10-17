import type { McpServer } from "@pilot43/protocol"

import type { HeaderEntry, McpServerDraft } from "./types"

export function createHeaderEntry(name = "", value = ""): HeaderEntry {
  return { id: crypto.randomUUID(), name, value }
}

export function createMcpServerDraft(
  server: McpServer | undefined,
): McpServerDraft {
  return {
    headers: Object.entries(server?.headers ?? {}).map(([name, value]) =>
      createHeaderEntry(name, value),
    ),
    name: server?.name ?? "",
    url: server?.url ?? "",
  }
}

/** Builds the server from the form, keeping extra fields of the original. */
export function draftToMcpServer(
  draft: McpServerDraft,
  original: McpServer | undefined,
): McpServer {
  const headers = Object.fromEntries(
    draft.headers
      .filter((header) => header.name.trim())
      .map((header) => [header.name.trim(), header.value]),
  )
  const { headers: _headers, ...rest } = original ?? {}

  return {
    ...rest,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    name: draft.name.trim(),
    type: "http",
    url: draft.url.trim(),
  }
}

/** Returns an error message for an invalid form, or `null`. */
export function validateMcpServerDraft(
  draft: McpServerDraft,
  servers: McpServer[],
  originalName: string | undefined,
): { name?: string; url?: string } {
  const name = draft.name.trim()
  const errors: { name?: string; url?: string } = {}

  if (!name) {
    errors.name = "Name is required"
  } else if (
    name !== originalName &&
    servers.some((server) => server.name === name)
  ) {
    errors.name = "A server with this name already exists"
  }

  try {
    const url = new URL(draft.url.trim())

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.url = "Use an http(s) URL"
    }
  } catch {
    errors.url = "Enter the full server URL, e.g. https://mcp.example.com/mcp"
  }

  return errors
}

/** Tool name without its `mcp__<server>__` prefix. */
export function getMcpToolDisplayName(toolName: string) {
  return toolName.replace(/^mcp__.+?__/, "")
}
