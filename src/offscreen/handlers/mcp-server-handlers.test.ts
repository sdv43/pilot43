import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AppSettings } from "@/shared/api"

import {
  handleMcpServerToolsGet,
  handleMcpServerUpdate,
} from "./mcp-server-handlers"

vi.mock("@/offscreen/storage", () => ({
  getAppSettings: vi.fn(),
  saveAppSettings: vi.fn(),
}))

vi.mock("@/offscreen/tools/mcp-client", () => ({
  listMcpServerTools: vi.fn(),
}))

import { getAppSettings, saveAppSettings } from "@/offscreen/storage"
import { listMcpServerTools } from "@/offscreen/tools/mcp-client"

const appSettings: AppSettings = {
  id: "app",
  titleGenerationModel: "disabled",
  mcpServers: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAppSettings).mockResolvedValue(appSettings)
  vi.mocked(saveAppSettings).mockImplementation((settings) =>
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
    const result = await handleMcpServerUpdate([
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
    expect(saveAppSettings).toHaveBeenCalledWith({
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
