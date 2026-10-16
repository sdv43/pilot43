import type { AppSettings } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  handleMcpServerToolsGet,
  handleMcpServerUpdate,
} from "./mcp-server-handlers"

vi.mock("../tools/mcp-client", () => ({
  listMcpServerTools: vi.fn(),
}))

import { createTestContext, type TestContext } from "../test-utils"
import { listMcpServerTools } from "../tools/mcp-client"

let ctx: TestContext

const appSettings: AppSettings = {
  id: "app",
  titleGenerationModel: "disabled",
  mcpServers: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  ctx = createTestContext()
  vi.mocked(ctx.store.getAppSettings).mockResolvedValue(appSettings)
  vi.mocked(ctx.store.saveAppSettings).mockImplementation((settings) =>
    Promise.resolve(settings),
  )
  vi.mocked(listMcpServerTools).mockResolvedValue([
    {
      serverName: "github",
      toolName: "search_code",
      definition: {
        id: "mcp__github__search_code",
        name: "mcp__github__search_code",
        description: "Search code on GitHub",
      },
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  ])
})

describe("mcp-server-handlers", () => {
  it("preserves extra fields when saving MCP servers", async () => {
    const result = await handleMcpServerUpdate(ctx, [
      {
        name: "github",
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: {
          Authorization: "Bearer token",
        },
        sessionId: "session-1",
      },
    ])

    expect(result).toEqual([
      {
        name: "github",
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: {
          Authorization: "Bearer token",
        },
        sessionId: "session-1",
      },
    ])
    expect(ctx.store.saveAppSettings).toHaveBeenCalledWith({
      ...appSettings,
      mcpServers: result,
    })
  })

  it("passes preserved fields through when loading MCP tools", async () => {
    const result = await handleMcpServerToolsGet({
      name: "github",
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: "Bearer token",
      },
      sessionId: "session-1",
    })

    expect(listMcpServerTools).toHaveBeenCalledWith({
      name: "github",
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: "Bearer token",
      },
      sessionId: "session-1",
    })
    expect(result).toEqual([
      {
        id: "mcp__github__search_code",
        name: "mcp__github__search_code",
        description: "Search code on GitHub",
      },
    ])
  })
})
