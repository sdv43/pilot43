import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AgentContext } from "../context"

import { createAgentStore, createMemoryStorage } from "../storage"
import {
  deleteExpiredChats,
  handleDataDeleteAll,
  recoverInterruptedRuns,
} from "./data-handlers"

const day = 24 * 60 * 60 * 1000
const now = 1_800_000_000_000

let ctx: AgentContext

beforeEach(() => {
  ctx = {
    notifier: { notify: vi.fn() },
    store: createAgentStore(createMemoryStorage()),
    systemPrompt: () => "",
    toolset: { providers: [], tools: [] },
  }
})

async function createChat(
  workspaceId: string,
  updatedAt: number,
  pinned = false,
) {
  const chat = await ctx.store.createChat(workspaceId, "Chat", {
    pinned,
    tools: [],
  })

  return await ctx.store.updateChatTimestamp(chat.id, updatedAt)
}

describe("deleteExpiredChats", () => {
  it("keeps every chat when retention is off", async () => {
    const workspace = await ctx.store.createWorkspace({ name: "Work" })
    await createChat(workspace.id, now - 1000 * day)

    expect(await deleteExpiredChats(ctx, now)).toBe(0)
    expect(await ctx.store.getChatsByWorkspace(workspace.id)).toHaveLength(1)
  })

  it("deletes unpinned chats older than the retention period", async () => {
    await ctx.store.saveAppSettings({
      chatRetentionDays: 30,
      id: "app",
      mcpServers: [],
    })
    const workspace = await ctx.store.createWorkspace({ name: "Work" })
    const recent = await createChat(workspace.id, now - 29 * day)
    const pinned = await createChat(workspace.id, now - 60 * day, true)
    const old = await createChat(workspace.id, now - 31 * day)
    await ctx.store.createMessageRun({
      assistantMessages: [],
      chatId: old.id,
      createdAt: 1,
      error: null,
      id: "run-1",
      modelMeta: { name: "m", provider: "p", settings: {} },
      status: "completed",
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

    expect(await deleteExpiredChats(ctx, now)).toBe(1)

    const remaining = await ctx.store.getChatsByWorkspace(workspace.id)
    expect(remaining.map((chat) => chat.id).sort()).toEqual(
      [recent.id, pinned.id].sort(),
    )
    expect(await ctx.store.getMessageRunById("run-1")).toBeUndefined()
    expect(ctx.notifier.notify).toHaveBeenCalledWith({ action: "chatsChanged" })
  })
})

describe("handleDataDeleteAll", () => {
  it("deletes all workspaces and chats and creates an empty workspace", async () => {
    const first = await ctx.store.createWorkspace({ name: "One" })
    const second = await ctx.store.createWorkspace({ name: "Two" })
    await createChat(first.id, now, true)
    await createChat(second.id, now)
    await ctx.store.createPrompt({ text: "Kept", title: "Prompt" })

    const workspace = await handleDataDeleteAll(ctx)

    expect(await ctx.store.getAllWorkspaces()).toEqual([workspace])
    expect(workspace).toMatchObject({
      lastSelectedChatId: null,
      name: "Personal",
    })
    expect(await ctx.store.getChatsByWorkspace(first.id)).toEqual([])
    expect(await ctx.store.getChatsByWorkspace(second.id)).toEqual([])
    expect(await ctx.store.getAllPrompts()).toHaveLength(1)
  })
})

describe("recoverInterruptedRuns", () => {
  it("stops runs left generating and clears the chat flag", async () => {
    const workspace = await ctx.store.createWorkspace({ name: "Work" })
    const chat = await createChat(workspace.id, now)
    await ctx.store.updateChatState(chat.id, { isGenerating: true })
    await ctx.store.createMessageRun({
      assistantMessages: [],
      chatId: chat.id,
      createdAt: 1,
      error: null,
      id: "run-1",
      modelMeta: { name: "m", provider: "p", settings: {} },
      status: "running",
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

    expect(await recoverInterruptedRuns(ctx)).toBe(1)
    expect(await ctx.store.getMessageRunById("run-1")).toMatchObject({
      status: "stopped",
    })
    expect(await ctx.store.getChatById(chat.id)).toMatchObject({
      isGenerating: false,
    })
  })
})
