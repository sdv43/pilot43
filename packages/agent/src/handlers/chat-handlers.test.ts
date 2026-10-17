import type { MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { createTestContext, type TestContext } from "../test-utils"
import { handleChatDelete, handleChatTokenEstimateGet } from "./chat-handlers"

let ctx: TestContext

function buildRun(overrides?: Partial<MessageRun>): MessageRun {
  return {
    id: "run",
    chatId: "chat",
    createdAt: Date.now(),
    userMessage: {
      id: "user",
      role: "user",
      messageRunId: "run",
      content: "hello",
      createdAt: Date.now(),
      attachments: [],
      tokenCount: 100,
    },
    assistantMessages: [],
    ...overrides,
  } as MessageRun
}

beforeEach(() => {
  vi.clearAllMocks()
  ctx = createTestContext()
})

describe("handleChatTokenEstimateGet", () => {
  it("returns null when chatId is missing", async () => {
    expect(await handleChatTokenEstimateGet(ctx, null)).toBeNull()
    expect(await handleChatTokenEstimateGet(ctx, undefined)).toBeNull()
  })

  it("returns null when there are no message runs", async () => {
    vi.mocked(ctx.store.getMessageRunsByChat).mockResolvedValue([])

    expect(await handleChatTokenEstimateGet(ctx, "chat")).toBeNull()
  })

  it("combines last promptTokens with assistant reply tokens", async () => {
    vi.mocked(ctx.store.getMessageRunsByChat).mockResolvedValue([
      buildRun({
        userMessage: {
          id: "user-1",
          role: "user",
          messageRunId: "run",
          content: "first",
          createdAt: Date.now(),
          attachments: [],
          tokenCount: 50,
        },
        assistantMessages: [
          {
            id: "assistant-1",
            role: "assistant",
            messageRunId: "run",
            content: "first answer",
            createdAt: Date.now(),
            tools: [],
            tokenCount: 7,
          },
        ],
      }),
      buildRun({
        id: "run-2",
        userMessage: {
          id: "user-2",
          role: "user",
          messageRunId: "run-2",
          content: "second",
          createdAt: Date.now(),
          attachments: [],
          tokenCount: 100,
        },
        assistantMessages: [
          {
            id: "assistant-2",
            role: "assistant",
            messageRunId: "run-2",
            content: "second answer",
            createdAt: Date.now(),
            tools: [],
            tokenCount: 11,
          },
        ],
      }),
    ])

    // Last run: promptTokens 100 + assistant tokens 11
    expect(await handleChatTokenEstimateGet(ctx, "chat")).toBe(111)
  })

  it("falls back to the closest previous run with a token count", async () => {
    vi.mocked(ctx.store.getMessageRunsByChat).mockResolvedValue([
      buildRun({
        userMessage: {
          id: "user-1",
          role: "user",
          messageRunId: "run",
          content: "first",
          createdAt: Date.now(),
          attachments: [],
          tokenCount: 50,
        },
        assistantMessages: [],
      }),
      buildRun({
        id: "run-2",
        userMessage: {
          id: "user-2",
          role: "user",
          messageRunId: "run-2",
          content: "second",
          createdAt: Date.now(),
          attachments: [],
          // tokenCount undefined: pending or failed run
        },
        assistantMessages: [],
      }),
    ])

    expect(await handleChatTokenEstimateGet(ctx, "chat")).toBe(50)
  })

  it("returns null when no run has a token count", async () => {
    vi.mocked(ctx.store.getMessageRunsByChat).mockResolvedValue([
      buildRun({
        userMessage: {
          id: "user-1",
          role: "user",
          messageRunId: "run",
          content: "first",
          createdAt: Date.now(),
          attachments: [],
        },
        assistantMessages: [],
      }),
    ])

    expect(await handleChatTokenEstimateGet(ctx, "chat")).toBeNull()
  })

  it("sums all assistant messages of the last run", async () => {
    vi.mocked(ctx.store.getMessageRunsByChat).mockResolvedValue([
      buildRun({
        userMessage: {
          id: "user-1",
          role: "user",
          messageRunId: "run",
          content: "first",
          createdAt: Date.now(),
          attachments: [],
          tokenCount: 200,
        },
        assistantMessages: [
          {
            id: "assistant-1",
            role: "assistant",
            messageRunId: "run",
            content: "part one",
            createdAt: Date.now(),
            tools: [],
            tokenCount: 5,
          },
          {
            id: "assistant-2",
            role: "assistant",
            messageRunId: "run",
            content: "part two",
            createdAt: Date.now(),
            tools: [],
            tokenCount: 9,
          },
        ],
      }),
    ])

    expect(await handleChatTokenEstimateGet(ctx, "chat")).toBe(214)
  })
})

describe("handleChatDelete", () => {
  it("deletes message runs, generated files and the chat itself", async () => {
    vi.mocked(ctx.store.getMessageRunsByChat).mockResolvedValue([])

    await handleChatDelete(ctx, "chat")

    expect(ctx.store.deleteMessageRunsByChat).toHaveBeenCalledWith("chat")
    expect(ctx.store.deleteGeneratedFilesByChat).toHaveBeenCalledWith("chat")
    expect(ctx.store.deleteChat).toHaveBeenCalledWith("chat")
  })
})
