import { describe, expect, it, vi } from "vitest"

import { createAgent } from "./create-agent"
import { createMemoryStorage } from "./storage"

function createTestAgent() {
  const notifier = { notify: vi.fn() }
  const storage = createMemoryStorage()
  const agent = createAgent({
    notifier,
    storage,
    systemPrompt: () => "System prompt",
    toolset: {
      providers: [],
      tools: [
        {
          definition: {
            description: "Visible",
            id: "visible",
            name: "visible",
          },
          execute: () => Promise.resolve({ ok: true }),
          inputSchema: {
            additionalProperties: false,
            properties: {},
            required: [],
            type: "object",
          },
        },
        {
          definition: {
            description: "Hidden",
            hidden: true,
            id: "hidden",
            name: "hidden",
          },
          execute: () => Promise.resolve({ ok: true }),
          inputSchema: {
            additionalProperties: false,
            properties: {},
            required: [],
            type: "object",
          },
        },
      ],
    },
  })

  return { agent, notifier, storage }
}

describe("createAgent", () => {
  it("serves the backend api from the provided storage", async () => {
    const { agent } = createTestAgent()

    const workspace = await agent.api.workspaceCreate({ name: "Work" })
    expect(await agent.api.workspaceGet()).toEqual([workspace])

    await agent.api.workspaceDelete(workspace.id)
    expect(await agent.api.workspaceGet()).toEqual([])
  })

  it("lists the toolset's visible built-in tools", async () => {
    const { agent } = createTestAgent()

    expect((await agent.api.modelToolGet()).map((tool) => tool.name)).toEqual([
      "visible",
    ])
  })

  it("keeps separate agents independent", async () => {
    const first = createTestAgent().agent
    const second = createTestAgent().agent

    await first.api.commandCreate({ description: "", name: "a", prompt: "" })

    expect(await first.api.commandGet()).toHaveLength(1)
    expect(await second.api.commandGet()).toEqual([])
  })

  it("notifies clients about message run changes", async () => {
    const { agent, notifier, storage } = createTestAgent()
    await storage.messageRuns.put({
      assistantMessages: [],
      chatId: "chat-1",
      createdAt: 1,
      error: null,
      id: "run-1",
      modelMeta: { name: "model", provider: "provider", settings: {} },
      status: "running",
      updatedAt: 1,
      userMessage: {
        attachments: [],
        content: "Hello",
        createdAt: 1,
        id: "user-1",
        messageRunId: "run-1",
        role: "user",
      },
    })
    await storage.chats.put({
      createdAt: 1,
      id: "chat-1",
      settings: { tools: [] },
      title: "Chat",
      updatedAt: 1,
      workspaceId: "workspace-1",
    })

    await agent.api.chatMessageRunStop("run-1")

    expect(await storage.messageRuns.getById("run-1")).toMatchObject({
      status: "stopped",
    })
    expect(notifier.notify).toHaveBeenCalledWith({
      action: "messageRunUpdated",
      payload: { chatId: "chat-1", messageRunId: "run-1" },
    })
  })
})
