import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const client = {
    callTool: vi.fn(),
    close: vi.fn(),
    connect: vi.fn(),
    getServerCapabilities: vi.fn(),
    listResourceTemplates: vi.fn(),
    listResources: vi.fn(),
    listTools: vi.fn(),
    readResource: vi.fn(),
  }

  return {
    Client: vi.fn(function MockClient() {
      return client
    }),
    StreamableHTTPClientTransport: vi.fn(function MockTransport(
      this: { options?: unknown; url?: unknown },
      url: unknown,
      options: unknown,
    ) {
      this.url = url
      this.options = options
    }),
    client,
  }
})

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: mocks.Client,
}))

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: mocks.StreamableHTTPClientTransport,
}))

import type { McpServer } from "@/shared/api"

import {
  callMcpServerTool,
  listMcpServerResources,
  listMcpServerTools,
  readMcpServerResource,
} from "./mcp-client"

const server: McpServer = {
  headers: { Authorization: "Bearer secret" },
  name: "github",
  type: "http",
  url: "https://mcp.example.test/",
}

beforeEach(() => {
  vi.clearAllMocks()

  mocks.client.connect.mockResolvedValue(undefined)
  mocks.client.close.mockResolvedValue(undefined)
  mocks.client.getServerCapabilities.mockReturnValue({ resources: {} })
  mocks.client.listTools.mockResolvedValue({ tools: [] })
  mocks.client.listResources.mockResolvedValue({ resources: [] })
  mocks.client.listResourceTemplates.mockResolvedValue({
    resourceTemplates: [],
  })
  mocks.client.readResource.mockResolvedValue({ contents: [] })
  mocks.client.callTool.mockResolvedValue({ content: [], isError: false })
})

describe("mcp-client", () => {
  it("maps MCP tools into model tool definitions", async () => {
    mocks.client.listTools.mockResolvedValue({
      tools: [
        {
          annotations: { title: "Search code" },
          description: "Search GitHub code",
          inputSchema: {
            additionalProperties: false,
            properties: { query: { description: "Query", type: "string" } },
            required: ["query"],
          },
          name: "search_code",
        },
      ],
    })

    const result = await listMcpServerTools(server)

    expect(mocks.StreamableHTTPClientTransport).toHaveBeenCalledWith(
      new URL(server.url),
      {
        requestInit: {
          headers: { Authorization: "Bearer secret" },
        },
      },
    )
    expect(result).toEqual([
      {
        definition: {
          defaultEnabled: false,
          description: "Search GitHub code",
          group: "github",
          id: "mcp__github__search_code",
          name: "mcp__github__search_code",
          shortDescription: "Search code",
        },
        inputSchema: {
          additionalProperties: false,
          properties: { query: { description: "Query", type: "string" } },
          required: ["query"],
          type: "object",
        },
        serverName: "github",
        toolName: "search_code",
      },
    ])
    expect(mocks.client.close).toHaveBeenCalledTimes(1)
  })

  it("lists resources and templates when the server supports them", async () => {
    mocks.client.listResources.mockResolvedValue({
      resources: [
        {
          description: "Repo README",
          mimeType: "text/markdown",
          name: "README",
          title: "README.md",
          uri: "repo://readme",
        },
      ],
    })
    mocks.client.listResourceTemplates.mockResolvedValue({
      resourceTemplates: [
        {
          description: "Repository file",
          mimeType: "text/plain",
          name: "repo-file",
          title: "Repo file",
          uriTemplate: "repo://files/{path}",
        },
      ],
    })

    const result = await listMcpServerResources(server)

    expect(result).toEqual([
      {
        description: "Repo README",
        kind: "resource",
        mimeType: "text/markdown",
        name: "README",
        serverName: "github",
        title: "README.md",
        uri: "repo://readme",
      },
      {
        description: "Repository file",
        kind: "resource_template",
        mimeType: "text/plain",
        name: "repo-file",
        serverName: "github",
        title: "Repo file",
        uriTemplate: "repo://files/{path}",
      },
    ])
  })

  it("returns an empty list when the server does not expose resources", async () => {
    mocks.client.getServerCapabilities.mockReturnValue({})

    const result = await listMcpServerResources(server)

    expect(result).toEqual([])
    expect(mocks.client.listResources).not.toHaveBeenCalled()
    expect(mocks.client.listResourceTemplates).not.toHaveBeenCalled()
  })

  it("reads MCP resources into a compact JSON-serializable payload", async () => {
    mocks.client.readResource.mockResolvedValue({
      contents: [
        {
          mimeType: "text/plain",
          text: "README contents",
          uri: "repo://readme",
        },
        {
          blob: "YmFzZTY0",
          mimeType: "application/octet-stream",
          uri: "repo://archive",
        },
      ],
    })

    const result = await readMcpServerResource(server, "repo://readme")

    expect(result).toEqual({
      contents: [
        {
          mimeType: "text/plain",
          text: "README contents",
          truncated: false,
          type: "text",
          uri: "repo://readme",
        },
        {
          blob: "YmFzZTY0",
          encoding: "base64",
          mimeType: "application/octet-stream",
          truncated: false,
          type: "blob",
          uri: "repo://archive",
        },
      ],
      ok: true,
      server: "github",
      text: "README contents",
      uri: "repo://readme",
    })
  })

  it("normalizes embedded resources and resource links from tool results", async () => {
    mocks.client.callTool.mockResolvedValue({
      content: [
        { text: "Done", type: "text" },
        {
          resource: {
            mimeType: "text/plain",
            text: "Resource body",
            uri: "repo://readme",
          },
          type: "resource",
        },
        {
          description: "README link",
          mimeType: "text/plain",
          name: "README",
          type: "resource_link",
          uri: "repo://readme",
        },
      ],
      isError: false,
      structuredContent: { ok: true },
    })

    const result = await callMcpServerTool(server, "search_code", {
      query: "README",
    })

    expect(result).toEqual({
      ok: true,
      parts: [
        {
          resource: {
            mimeType: "text/plain",
            text: "Resource body",
            truncated: false,
            type: "text",
            uri: "repo://readme",
          },
          type: "resource",
        },
        {
          description: "README link",
          mimeType: "text/plain",
          name: "README",
          title: undefined,
          type: "resource_link",
          uri: "repo://readme",
        },
      ],
      structuredContent: { ok: true },
      text: "Done",
    })
  })
})
