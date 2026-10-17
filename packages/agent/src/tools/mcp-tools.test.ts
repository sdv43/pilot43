import type { Chat, McpServer } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type * as mcpClient from "./mcp-client"
import type { ToolContext } from "./types"

const mocks = vi.hoisted(() => ({
  callMcpServerTool: vi.fn(),
  listMcpServerResources: vi.fn(),
  listMcpServerTools: vi.fn(),
  readMcpServerResource: vi.fn(),
}))

vi.mock("./mcp-client", async () => {
  const actual = await vi.importActual<typeof mcpClient>("./mcp-client")

  return {
    ...actual,
    callMcpServerTool: mocks.callMcpServerTool,
    listMcpServerResources: mocks.listMcpServerResources,
    listMcpServerTools: mocks.listMcpServerTools,
    readMcpServerResource: mocks.readMcpServerResource,
  }
})

import { createTestContext } from "../test-utils"
import { mcpToolProvider } from "./mcp-tools"
import { executeToolCalls } from "./runtime"

const githubServer: McpServer = {
  name: "github",
  type: "http",
  url: "https://mcp.example.test/",
}

const enabledChat: Chat = {
  createdAt: 1,
  id: "chat-1",
  settings: {
    tools: [{ enabled: true, name: "mcp__github" }],
  },
  title: "Chat",
  updatedAt: 1,
  workspaceId: "workspace-1",
}

const { store } = createTestContext()

const context: ToolContext = {
  askUser: vi.fn(),
  chatId: enabledChat.id,
  messageRunId: "run-1",
  signal: new AbortController().signal,
  store,
}

beforeEach(() => {
  vi.clearAllMocks()

  store.getAppSettings.mockResolvedValue({
    id: "app",
    mcpServers: [githubServer],
  })
  mocks.listMcpServerTools.mockResolvedValue([
    {
      definition: {
        defaultEnabled: false,
        description: "Search code",
        group: "github",
        id: "mcp__github__search_code",
        name: "mcp__github__search_code",
      },
      inputSchema: {
        additionalProperties: false,
        properties: {},
        required: [],
        type: "object",
      },
      serverName: "github",
      toolName: "search_code",
    },
  ])
  mocks.listMcpServerResources.mockResolvedValue([
    {
      kind: "resource",
      name: "README",
      serverName: "github",
      uri: "repo://readme",
    },
  ])
  mocks.readMcpServerResource.mockResolvedValue({
    ok: true,
    text: "README body",
    uri: "repo://readme",
  })
  mocks.callMcpServerTool.mockResolvedValue({ ok: true, text: "found" })
})

describe("mcpToolProvider", () => {
  it("hides servers the workspace does not allow", async () => {
    store.getWorkspaceById.mockResolvedValueOnce({
      id: "workspace-1",
      lastSelectedChatId: null,
      mcpServers: [],
      name: "Work",
    })

    expect(await mcpToolProvider.resolveTools(enabledChat, context)).toEqual([])
  })

  it("advertises MCP resource tools only when an MCP server is enabled", async () => {
    const enabledTools = await mcpToolProvider.resolveTools(
      enabledChat,
      context,
    )

    expect(enabledTools.map((tool) => tool.definition.name)).toEqual([
      "list_mcp_resources",
      "read_mcp_resource",
      "mcp__github__search_code",
    ])

    const disabledTools = await mcpToolProvider.resolveTools(
      {
        ...enabledChat,
        settings: { tools: [] },
      },
      context,
    )

    expect(disabledTools).toEqual([])
  })

  it("exposes all tools of an enabled server unless a tool is disabled", async () => {
    const tools = await mcpToolProvider.resolveTools(
      {
        ...enabledChat,
        settings: {
          tools: [
            { enabled: true, name: "mcp__github" },
            { enabled: false, name: "mcp__github__search_code" },
          ],
        },
      },
      context,
    )

    expect(tools.map((tool) => tool.definition.name)).toEqual([
      "list_mcp_resources",
      "read_mcp_resource",
    ])
  })

  it("skips servers whose tools cannot be listed", async () => {
    mocks.listMcpServerTools.mockRejectedValueOnce(new Error("Offline"))

    const tools = await mcpToolProvider.resolveTools(enabledChat, context)

    expect(tools.map((tool) => tool.definition.name)).toEqual([
      "list_mcp_resources",
      "read_mcp_resource",
    ])
  })

  it("calls MCP server tools on their server without local validation", async () => {
    const tools = await mcpToolProvider.resolveTools(enabledChat, context)
    const searchCode = tools.find(
      (tool) => tool.definition.name === "mcp__github__search_code",
    )

    expect(() => searchCode?.validateArgs?.({ query: 1 })).not.toThrow()
    await expect(searchCode?.execute({ query: "x" }, context)).resolves.toEqual(
      { ok: true, text: "found" },
    )
    expect(mocks.callMcpServerTool).toHaveBeenCalledWith(
      githubServer,
      "search_code",
      { query: "x" },
    )
  })

  it("executes the MCP resource tools against enabled servers", async () => {
    const enabledTools = await mcpToolProvider.resolveTools(
      enabledChat,
      context,
    )
    const assistantMessage = {
      content: "",
      createdAt: 1,
      id: "assistant-1",
      messageRunId: "run-1",
      role: "assistant" as const,
      tools: [],
    }

    await executeToolCalls(
      [
        {
          arguments: "{}",
          id: "call-1",
          name: "list_mcp_resources",
        },
        {
          arguments: '{"server":"github","uri":"repo://readme"}',
          id: "call-2",
          name: "read_mcp_resource",
        },
      ],
      enabledTools,
      assistantMessage,
      { ...context, askUser: vi.fn() },
    )

    expect(mocks.listMcpServerResources).toHaveBeenCalledWith(githubServer)
    expect(mocks.readMcpServerResource).toHaveBeenCalledWith(
      githubServer,
      "repo://readme",
    )
    expect(assistantMessage.tools).toMatchObject([
      {
        args: {},
        id: "call-1",
        name: "list_mcp_resources",
        result: {
          ok: true,
          resources: [
            {
              kind: "resource",
              name: "README",
              serverName: "github",
              uri: "repo://readme",
            },
          ],
        },
      },
      {
        args: { server: "github", uri: "repo://readme" },
        id: "call-2",
        name: "read_mcp_resource",
        result: {
          ok: true,
          text: "README body",
          uri: "repo://readme",
        },
      },
    ])
  })

  it("rejects resource reads from servers that are not enabled", async () => {
    const tools = await mcpToolProvider.resolveTools(enabledChat, context)
    const readResource = tools.find(
      (tool) => tool.definition.name === "read_mcp_resource",
    )

    await expect(
      readResource?.execute({ server: "other", uri: "x://y" }, context),
    ).resolves.toEqual({
      error: "MCP server `other` is not enabled for this chat.",
      ok: false,
    })
  })
})
