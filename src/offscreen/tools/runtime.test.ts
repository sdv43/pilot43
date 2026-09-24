import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Chat, McpServer } from "@/shared/api"

import type * as mcpClient from "./mcp-client"

const mocks = vi.hoisted(() => ({
  callMcpServerTool: vi.fn(),
  executeFetchTool: vi.fn(),
  executeGenerateFileTool: vi.fn(),
  executeReadWebpageTool: vi.fn(),
  executeRunJsTool: vi.fn(),
  executeUpdateTodoListTool: vi.fn(),
  getAppSettings: vi.fn(),
  getChatById: vi.fn(),
  listMcpServerResources: vi.fn(),
  listMcpServerTools: vi.fn(),
  parseAskFollowupQuestionArgs: vi.fn(),
  readMcpServerResource: vi.fn(),
}))

vi.mock("../storage", () => ({
  getAppSettings: mocks.getAppSettings,
  getChatById: mocks.getChatById,
}))

vi.mock("./executors", () => ({
  askFollowupQuestionToolName: "ask_followup_question",
  executeFetchTool: mocks.executeFetchTool,
  executeGenerateFileTool: mocks.executeGenerateFileTool,
  executeReadWebpageTool: mocks.executeReadWebpageTool,
  executeRunJsTool: mocks.executeRunJsTool,
  executeUpdateTodoListTool: mocks.executeUpdateTodoListTool,
  parseAskFollowupQuestionArgs: mocks.parseAskFollowupQuestionArgs,
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

import { executeToolCalls, getEnabledTools } from "./runtime"

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

beforeEach(() => {
  vi.clearAllMocks()

  mocks.getAppSettings.mockResolvedValue({
    id: "app",
    mcpServers: [githubServer],
    titleGenerationModel: "disabled",
  })
  mocks.getChatById.mockResolvedValue(enabledChat)
  mocks.listMcpServerTools.mockResolvedValue([
    {
      definition: {
        description: "Search code",
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
})

describe("runtime MCP resource tools", () => {
  it("advertises MCP resource tools only when an MCP server is enabled", async () => {
    const enabledTools = await getEnabledTools(enabledChat)

    expect(enabledTools.map((tool) => tool.definition.name)).toEqual(
      expect.arrayContaining([
        "list_mcp_resources",
        "read_mcp_resource",
        "mcp__github__search_code",
      ]),
    )

    const disabledTools = await getEnabledTools({
      ...enabledChat,
      settings: { tools: [] },
    })

    expect(disabledTools.map((tool) => tool.definition.name)).not.toEqual(
      expect.arrayContaining(["list_mcp_resources", "read_mcp_resource"]),
    )
  })

  it("executes the MCP resource tools against enabled servers", async () => {
    const enabledTools = await getEnabledTools(enabledChat)

    const results = await executeToolCalls(
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
      enabledChat.id,
    )

    expect(mocks.listMcpServerResources).toHaveBeenCalledWith(githubServer)
    expect(mocks.readMcpServerResource).toHaveBeenCalledWith(
      githubServer,
      "repo://readme",
    )
    expect(results).toEqual([
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
})
