import type { GeneratedFile, MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it } from "vitest"

import { createMemoryStorage } from "./memory-storage"
import { type AgentStore, createAgentStore } from "./store"
import { type AgentStorage } from "./types"

let storage: AgentStorage
let store: AgentStore

beforeEach(() => {
  storage = createMemoryStorage()
  store = createAgentStore(storage)
})

function buildRun(id: string, chatId: string, createdAt: number): MessageRun {
  return {
    assistantMessages: [],
    chatId,
    createdAt,
    error: null,
    id,
    modelMeta: { name: "model", provider: "provider", settings: {} },
    status: "completed",
    updatedAt: createdAt,
    userMessage: {
      attachments: [],
      content: "Hello",
      createdAt,
      id: `${id}-user`,
      messageRunId: id,
      role: "user",
    },
  }
}

function buildFile(overrides: Partial<GeneratedFile> = {}): GeneratedFile {
  return {
    chatId: "chat-1",
    content: "one",
    createdAt: 1,
    filename: "a.txt",
    id: "file-1",
    mimeType: "text/plain",
    size: 3,
    updatedAt: 1,
    ...overrides,
  }
}

describe("app settings", () => {
  it("persists defaults on first access", async () => {
    expect(await store.getAppSettings()).toEqual({
      chatRetentionDays: null,
      id: "app",
      mcpServers: [],
    })
    expect(await storage.appSettings.get()).toEqual({
      chatRetentionDays: null,
      id: "app",
      mcpServers: [],
    })
  })

  it("backfills fields missing from older records", async () => {
    await storage.appSettings.put({ id: "app" } as never)

    expect(await store.getAppSettings()).toEqual({
      chatRetentionDays: null,
      id: "app",
      mcpServers: [],
    })
  })
})

describe("chats", () => {
  it("creates chats and updates their fields", async () => {
    const chat = await store.createChat("workspace-1", "Title")

    expect(chat).toMatchObject({
      settings: { tools: [] },
      title: "Title",
      workspaceId: "workspace-1",
    })
    expect(await store.getChatsByWorkspace("workspace-1")).toEqual([chat])
    expect(await store.getChatsByWorkspace("workspace-2")).toEqual([])

    await store.updateChatTitle(chat.id, "Renamed")
    await store.updateChatTimestamp(chat.id, 42)

    expect(await store.getChatById(chat.id)).toMatchObject({
      title: "Renamed",
      updatedAt: 42,
    })
  })

  it("normalizes an empty todo list to null", async () => {
    const chat = await store.createChat("workspace-1", "Title")

    expect((await store.updateChatTodoList(chat.id, "[ ] a")).todoList).toBe(
      "[ ] a",
    )
    expect((await store.updateChatTodoList(chat.id, "  ")).todoList).toBeNull()
  })

  it("rejects updates of missing chats", async () => {
    await expect(store.updateChatTitle("missing", "x")).rejects.toThrow(
      "Chat not found",
    )
  })
})

describe("message runs", () => {
  it("returns a chat's runs ordered by creation time", async () => {
    await store.createMessageRun(buildRun("b", "chat-1", 2))
    await store.createMessageRun(buildRun("a", "chat-1", 1))
    await store.createMessageRun(buildRun("other", "chat-2", 0))

    expect(
      (await store.getMessageRunsByChat("chat-1")).map((run) => run.id),
    ).toEqual(["a", "b"])
  })

  it("deletes the runs created after a run", async () => {
    await store.createMessageRun(buildRun("a", "chat-1", 1))
    await store.createMessageRun(buildRun("b", "chat-1", 2))
    await store.createMessageRun(buildRun("c", "chat-1", 3))

    const deleted = await store.deleteMessageRunsAfter("a")

    expect(deleted.map((run) => run.id)).toEqual(["b", "c"])
    expect(
      (await store.getMessageRunsByChat("chat-1")).map((run) => run.id),
    ).toEqual(["a"])
    expect(await store.deleteMessageRunsAfter("missing")).toEqual([])
  })

  it("deletes all runs of a chat", async () => {
    await store.createMessageRun(buildRun("a", "chat-1", 1))
    await store.createMessageRun(buildRun("other", "chat-2", 1))

    await store.deleteMessageRunsByChat("chat-1")

    expect(await store.getMessageRunsByChat("chat-1")).toEqual([])
    expect(await store.getMessageRunsByChat("chat-2")).toHaveLength(1)
  })
})

describe("generated files", () => {
  it("appends chunks to an existing file", async () => {
    await store.createGeneratedFile(buildFile())

    const updated = await store.appendToGeneratedFile("file-1", "two", {
      chatId: "chat-1",
      maxSize: 10,
    })

    expect(updated).toMatchObject({ content: "onetwo", size: 6 })
    expect(await store.getGeneratedFile("file-1")).toMatchObject({
      content: "onetwo",
    })
  })

  it("reports files of other chats as missing", async () => {
    await store.createGeneratedFile(buildFile())

    await expect(
      store.appendToGeneratedFile("file-1", "two", { chatId: "chat-2" }),
    ).rejects.toThrow("Generated file `file-1` not found.")
  })

  it("does not write chunks that exceed the size limit", async () => {
    await store.createGeneratedFile(buildFile())

    await expect(
      store.appendToGeneratedFile("file-1", "toolong", { maxSize: 5 }),
    ).rejects.toThrow("would exceed 5 characters")
    expect(await store.getGeneratedFile("file-1")).toMatchObject({
      content: "one",
    })
  })
})

describe("prompts, workspaces and providers", () => {
  it("sorts prompts by title", async () => {
    await store.createPrompt({ text: "", title: "b" })
    await store.createPrompt({ text: "", title: "a" })

    expect((await store.getAllPrompts()).map((p) => p.title)).toEqual([
      "a",
      "b",
    ])
  })

  it("creates workspaces without a selected chat", async () => {
    expect(await store.createWorkspace({ name: "Work" })).toMatchObject({
      lastSelectedChatId: null,
      name: "Work",
    })
  })

  it("drops the removed request limit from stored providers", async () => {
    await storage.modelProviders.put({
      id: "p1",
      maxRequestPerMinute: 40,
      name: "Local",
      settings: { host: "http://localhost:11434" },
      type: "ollama",
    } as never)

    expect(await store.getModelProviderById("p1")).toEqual({
      id: "p1",
      name: "Local",
      settings: { host: "http://localhost:11434" },
      type: "ollama",
    })
  })

  it("gives new workspaces the default colour", async () => {
    expect(await store.createWorkspace({ name: "Work" })).toMatchObject({
      color: "violet",
    })
  })

  it("migrates app settings saved by older versions", async () => {
    await storage.appSettings.put({
      id: "app",
      titleGenerationModel: "disabled",
    } as never)

    expect(await store.getAppSettings()).toEqual({
      chatRetentionDays: null,
      id: "app",
      mcpServers: [],
    })
  })
})
