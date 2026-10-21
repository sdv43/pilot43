import type { MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AgentContext } from "../../context"

import { createAgentStore, createMemoryStorage } from "../../storage"
import { handleChatMessageRunStop } from "./handleChatMessageRunStop"

let ctx: AgentContext

beforeEach(() => {
  ctx = {
    notifier: { notify: vi.fn() },
    store: createAgentStore(createMemoryStorage()),
    systemPrompt: () => "",
    toolset: { providers: [], tools: [] },
  }
})

async function createRun(status: MessageRun["status"]) {
  const workspace = await ctx.store.createWorkspace({ name: "Work" })
  const chat = await ctx.store.createChat(workspace.id, "Chat", { tools: [] })

  return await ctx.store.createMessageRun({
    assistantMessages: [],
    chatId: chat.id,
    createdAt: 1,
    error: status === "failed" ? "Boom" : null,
    id: "run-1",
    modelMeta: { name: "m", provider: "p", settings: {} },
    status,
    updatedAt: 1,
    userMessage: {
      attachments: [],
      content: "Hi",
      createdAt: 1,
      id: "u1",
      messageRunId: "run-1",
      role: "user",
    },
  })
}

describe("handleChatMessageRunStop", () => {
  it.each(["pending", "running", "awaiting_input"] as const)(
    "stops a %s run and notifies the side panel",
    async (status) => {
      const run = await createRun(status)

      await handleChatMessageRunStop(ctx, run.id)

      expect(await ctx.store.getMessageRunById(run.id)).toMatchObject({
        status: "stopped",
      })
      expect(ctx.notifier.notify).toHaveBeenCalledWith({
        action: "messageRunUpdated",
        payload: { chatId: run.chatId, messageRunId: run.id },
      })
    },
  )

  it.each(["completed", "failed", "stopped"] as const)(
    "keeps the status of a %s run",
    async (status) => {
      const run = await createRun(status)

      await handleChatMessageRunStop(ctx, run.id)

      expect(await ctx.store.getMessageRunById(run.id)).toMatchObject({
        status,
        updatedAt: 1,
      })
      expect(ctx.notifier.notify).not.toHaveBeenCalled()
    },
  )

  it("clears the chat's generating flag", async () => {
    const run = await createRun("running")
    await ctx.store.updateChatState(run.chatId, {
      isGenerating: true,
      preview: undefined,
    })

    await handleChatMessageRunStop(ctx, run.id)

    expect((await ctx.store.getChatById(run.chatId))?.isGenerating).toBe(false)
  })
})
