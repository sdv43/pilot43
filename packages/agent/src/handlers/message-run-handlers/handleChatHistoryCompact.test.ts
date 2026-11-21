import type { MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AgentContext } from "../../context"

import { createAgentStore, createMemoryStorage } from "../../storage"
import { handleChatHistoryCompact } from "./handleChatHistoryCompact"

const mocks = vi.hoisted(() => ({ summariseChatHistory: vi.fn() }))

vi.mock("./utils/history-summary", () => ({
  summariseChatHistory: mocks.summariseChatHistory,
}))

let ctx: AgentContext

beforeEach(() => {
  mocks.summariseChatHistory.mockReset()
  ctx = {
    notifier: { notify: vi.fn() },
    store: createAgentStore(createMemoryStorage()),
    systemPrompt: () => "",
    toolset: { providers: [], tools: [] },
  }
})

async function setUp(runCount: number) {
  const workspace = await ctx.store.createWorkspace({ name: "Work" })
  const chat = await ctx.store.createChat(workspace.id, "Chat", { tools: [] })
  const provider = await ctx.store.createModelProvider({
    name: "OpenAI",
    settings: { apiKey: "sk" },
    type: "openai",
  } as never)

  for (let index = 0; index < runCount; index += 1) {
    await ctx.store.createMessageRun({
      assistantMessages: [],
      chatId: chat.id,
      createdAt: index + 1,
      error: null,
      id: `run-${index + 1}`,
      modelMeta: { name: "m", provider: provider.id, settings: {} },
      status: "completed",
      updatedAt: index + 1,
      userMessage: {
        attachments: [],
        content: "Hi",
        createdAt: index + 1,
        id: `user-${index + 1}`,
        messageRunId: `run-${index + 1}`,
        role: "user",
      },
    } satisfies MessageRun)
  }

  return { chat, model: { name: "m", providerId: provider.id } }
}

describe("handleChatHistoryCompact", () => {
  it("summarises every run of the chat", async () => {
    const { chat, model } = await setUp(2)
    mocks.summariseChatHistory.mockResolvedValue({ content: "Summary" })

    await handleChatHistoryCompact(ctx, chat.id, {
      ...model,
      contextWindow: 50_000,
    })

    expect(mocks.summariseChatHistory).toHaveBeenCalledOnce()
    const options = mocks.summariseChatHistory.mock.calls[0][1] as {
      contextWindow: number
      keepRecent: boolean
      notifyRunId: string
      runs: MessageRun[]
    }
    expect(options).toMatchObject({
      contextWindow: 50_000,
      keepRecent: false,
      notifyRunId: "run-2",
    })
    expect(options.runs.map(({ id }) => id)).toEqual(["run-1", "run-2"])
  })

  it("refuses an empty chat, a busy chat and one already summarised", async () => {
    const empty = await setUp(0)
    await expect(
      handleChatHistoryCompact(ctx, empty.chat.id, empty.model),
    ).rejects.toThrow(/nothing to summarise/)

    const busy = await setUp(1)
    await ctx.store.updateChatState(busy.chat.id, { isGenerating: true })
    await expect(
      handleChatHistoryCompact(ctx, busy.chat.id, busy.model),
    ).rejects.toThrow(/finish first/)

    const done = await setUp(1)
    mocks.summariseChatHistory.mockResolvedValue(undefined)
    await expect(
      handleChatHistoryCompact(ctx, done.chat.id, done.model),
    ).rejects.toThrow(/already summarised/)
  })
})
