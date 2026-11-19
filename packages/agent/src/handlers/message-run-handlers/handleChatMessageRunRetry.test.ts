import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AgentContext } from "../../context"

import { createAgentStore, createMemoryStorage } from "../../storage"
import { handleChatMessageRunRetry } from "./handleChatMessageRunRetry"

const mocks = vi.hoisted(() => ({ generateResponse: vi.fn() }))

vi.mock("./utils/generateResponse", () => ({
  generateResponse: mocks.generateResponse,
}))

let ctx: AgentContext

beforeEach(() => {
  mocks.generateResponse.mockReset()
  ctx = {
    notifier: { notify: vi.fn() },
    store: createAgentStore(createMemoryStorage()),
    systemPrompt: () => "",
    toolset: { providers: [], tools: [] },
  }
})

async function createRun() {
  const workspace = await ctx.store.createWorkspace({ name: "Work" })
  const chat = await ctx.store.createChat(workspace.id, "Chat", { tools: [] })
  const provider = await ctx.store.createModelProvider({
    name: "OpenAI",
    settings: { apiKey: "sk" },
    type: "openai",
  } as never)

  return await ctx.store.createMessageRun({
    assistantMessages: [],
    chatId: chat.id,
    createdAt: 1,
    error: null,
    id: "run-1",
    modelMeta: { name: "m", provider: provider.id, settings: {} },
    status: "completed",
    updatedAt: 1,
    userMessage: {
      attachmentReferences: [{ attachmentIndex: 0, end: 5, id: "a", start: 0 }],
      attachments: [],
      content: "#tab summarise",
      createdAt: 1,
      id: "u1",
      messageRunId: "run-1",
      role: "user",
    },
  })
}

describe("handleChatMessageRunRetry", () => {
  it("edits the user message before generating again", async () => {
    const run = await createRun()

    await handleChatMessageRunRetry(ctx, run.id, "Summarise in 3 bullets")

    const saved = await ctx.store.getMessageRunById(run.id)

    expect(saved?.userMessage.content).toBe("Summarise in 3 bullets")
    expect(saved?.userMessage.attachmentReferences).toBeUndefined()
    expect(saved?.status).toBe("pending")
    expect(mocks.generateResponse).toHaveBeenCalledOnce()
  })

  it("keeps the message as is without new content", async () => {
    const run = await createRun()

    await handleChatMessageRunRetry(ctx, run.id)

    const saved = await ctx.store.getMessageRunById(run.id)

    expect(saved?.userMessage.content).toBe("#tab summarise")
    expect(saved?.userMessage.attachmentReferences).toHaveLength(1)
  })
})
