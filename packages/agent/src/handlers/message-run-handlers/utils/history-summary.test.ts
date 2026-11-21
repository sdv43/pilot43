import type { Chat, MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AgentContext } from "../../../context"
import type { ChatMessage, ModelAdapter, StreamChunk } from "../../../models"

import { createAgentStore, createMemoryStorage } from "../../../storage"
import {
  chunkTranscripts,
  getRunsToSummarise,
  invalidateHistorySummary,
  isContextOverflowError,
  summariseChatHistory,
  writeHistorySummary,
} from "./history-summary"

function makeRun(id: string, text = "Hello", createdAt = 1): MessageRun {
  return {
    assistantMessages: [
      {
        content: `Reply to ${text}`,
        createdAt: createdAt + 1,
        id: `assistant-${id}`,
        messageRunId: id,
        role: "assistant",
        tools: [],
      },
    ],
    chatId: "chat-1",
    createdAt,
    error: null,
    id,
    modelMeta: { name: "m", provider: "p", settings: {} },
    status: "completed",
    updatedAt: createdAt,
    userMessage: {
      attachments: [],
      content: text,
      createdAt,
      id: `user-${id}`,
      messageRunId: id,
      role: "user",
    },
  }
}

/** Adapter replying with the given texts in turn, recording the requests. */
function createAdapter(replies: string[]) {
  const requests: ChatMessage[][] = []
  const adapter = {
    chat(messages: ChatMessage[]): AsyncIterable<StreamChunk> {
      requests.push(messages)
      const reply = replies.shift() ?? ""

      return {
        async *[Symbol.asyncIterator]() {
          await Promise.resolve()
          yield { content: reply, done: false }
          yield { content: "", done: true }
        },
      }
    },
  } as unknown as ModelAdapter

  return { adapter, requests }
}

describe("getRunsToSummarise", () => {
  const runs = ["r1", "r2", "r3", "r4"].map((id) => makeRun(id))

  it("keeps the latest two runs in full", () => {
    expect(
      getRunsToSummarise(runs, {
        contextWindow: 100_000,
        keepRecent: true,
      }).map(({ id }) => id),
    ).toEqual(["r1", "r2"])
  })

  it("summarises recent runs too when they would take most of the window", () => {
    const large = [...runs.slice(0, 3), makeRun("r4", "x".repeat(4000))]

    expect(
      getRunsToSummarise(large, { contextWindow: 2000, keepRecent: true }).map(
        ({ id }) => id,
      ),
    ).toEqual(["r1", "r2", "r3", "r4"])
  })

  it("keeps only the latest run when the window is unknown", () => {
    expect(
      getRunsToSummarise(runs, { keepRecent: true }).map(({ id }) => id),
    ).toEqual(["r1", "r2", "r3"])
  })

  it("starts after the runs the summary already covers", () => {
    const summary = {
      content: "",
      createdAt: 1,
      throughRunId: "r2",
      tokenCount: 0,
    }

    expect(
      getRunsToSummarise(runs, { keepRecent: false, summary }).map(
        ({ id }) => id,
      ),
    ).toEqual(["r3", "r4"])
  })
})

describe("chunkTranscripts", () => {
  it("packs transcripts into pieces of at most the given length", () => {
    expect(chunkTranscripts(["aaaa", "bb", "cccccc"], 8)).toEqual([
      "aaaa\n\nbb",
      "cccccc",
    ])
    expect(chunkTranscripts(["abcdefghij"], 4)).toEqual(["abcd", "efgh", "ij"])
  })
})

describe("writeHistorySummary", () => {
  it("summarises long runs in pieces, merging each into the summary so far", async () => {
    const { adapter, requests } = createAdapter(
      Array.from({ length: 10 }, (_, index) => `Summary ${index + 1}`),
    )

    const summary = await writeHistorySummary({
      adapter,
      contextWindow: 1000,
      runs: [makeRun("r1", "a".repeat(2000)), makeRun("r2", "b".repeat(2000))],
    })

    expect(requests.length).toBeGreaterThan(1)
    expect(summary).toBe(`Summary ${requests.length}`)
    expect(requests[0][1].content).not.toContain("<previous_summary>")
    expect(requests[1][1].content).toContain(
      "<previous_summary>\nSummary 1\n</previous_summary>",
    )
  })

  it("fails on an empty summary", async () => {
    const { adapter } = createAdapter(["  "])

    await expect(
      writeHistorySummary({ adapter, runs: [makeRun("r1")] }),
    ).rejects.toThrow(/empty summary/)
  })
})

describe("summariseChatHistory", () => {
  let ctx: AgentContext
  let chat: Chat

  beforeEach(async () => {
    ctx = {
      notifier: { notify: vi.fn() },
      store: createAgentStore(createMemoryStorage()),
      systemPrompt: () => "",
      toolset: { providers: [], tools: [] },
    }
    const workspace = await ctx.store.createWorkspace({ name: "Work" })
    chat = await ctx.store.createChat(workspace.id, "Chat", { tools: [] })
  })

  it("saves a summary of the earlier runs, merged with the previous one", async () => {
    const runs = ["r1", "r2", "r3", "r4"].map((id) => makeRun(id))
    await ctx.store.updateChatState(chat.id, {
      historySummary: {
        content: "Old summary",
        createdAt: 1,
        throughRunId: "r1",
        tokenCount: 3,
      },
    })
    const { adapter, requests } = createAdapter(["New summary"])

    const summary = await summariseChatHistory(ctx, {
      adapter,
      chatId: chat.id,
      contextWindow: 100_000,
      keepRecent: true,
      notifyRunId: "r4",
      runs,
    })

    expect(summary).toMatchObject({
      content: "New summary",
      throughRunId: "r2",
    })
    expect(requests[0][1].content).toContain("Old summary")
    expect(await ctx.store.getChatById(chat.id)).toMatchObject({
      historySummary: { content: "New summary", throughRunId: "r2" },
      isSummarisingHistory: false,
    })
  })

  it("does nothing when every run is already covered or kept", async () => {
    const { adapter, requests } = createAdapter([])

    await expect(
      summariseChatHistory(ctx, {
        adapter,
        chatId: chat.id,
        contextWindow: 100_000,
        keepRecent: true,
        notifyRunId: "r2",
        runs: [makeRun("r1"), makeRun("r2")],
      }),
    ).resolves.toBeUndefined()
    expect(requests).toHaveLength(0)
  })

  it("clears the summarising flag when the summary fails", async () => {
    const { adapter } = createAdapter([""])

    await expect(
      summariseChatHistory(ctx, {
        adapter,
        chatId: chat.id,
        keepRecent: false,
        notifyRunId: "r1",
        runs: [makeRun("r1")],
      }),
    ).rejects.toThrow()

    const saved = await ctx.store.getChatById(chat.id)
    expect(saved?.isSummarisingHistory).toBe(false)
    expect(saved?.historySummary).toBeUndefined()
  })
})

describe("invalidateHistorySummary", () => {
  let ctx: AgentContext
  let chat: Chat

  beforeEach(async () => {
    ctx = {
      notifier: { notify: vi.fn() },
      store: createAgentStore(createMemoryStorage()),
      systemPrompt: () => "",
      toolset: { providers: [], tools: [] },
    }
    const workspace = await ctx.store.createWorkspace({ name: "Work" })
    chat = await ctx.store.createChat(workspace.id, "Chat", { tools: [] })

    for (const [index, id] of ["r1", "r2", "r3"].entries()) {
      await ctx.store.createMessageRun({
        ...makeRun(id, "Hi", index + 1),
        chatId: chat.id,
      })
    }

    await ctx.store.updateChatState(chat.id, {
      historySummary: {
        content: "Summary",
        createdAt: 1,
        throughRunId: "r2",
        tokenCount: 2,
      },
    })
  })

  it("keeps the summary when a later run changes", async () => {
    await invalidateHistorySummary(ctx, chat.id, "r3")

    expect((await ctx.store.getChatById(chat.id))?.historySummary).toBeTruthy()
  })

  it("drops the summary when a run it covers changes", async () => {
    await invalidateHistorySummary(ctx, chat.id, "r1")

    expect((await ctx.store.getChatById(chat.id))?.historySummary).toBeNull()
  })

  it("drops the summary when its last run is gone", async () => {
    await ctx.store.deleteMessageRun("r2")
    await invalidateHistorySummary(ctx, chat.id)

    expect((await ctx.store.getChatById(chat.id))?.historySummary).toBeNull()
  })
})

describe("isContextOverflowError", () => {
  it.each([
    { code: "context_length_exceeded", message: "" },
    {
      message:
        "This model's maximum context length is 8192 tokens. However, your messages resulted in 9000 tokens.",
    },
    { message: "prompt is too long: 210000 tokens > 200000 maximum" },
    { message: "Input exceeds the context window of this model" },
  ])("recognises %o", (error) => {
    expect(isContextOverflowError(error)).toBe(true)
  })

  it("ignores other errors", () => {
    expect(isContextOverflowError(new Error("Rate limit reached"))).toBe(false)
    expect(isContextOverflowError("context length")).toBe(false)
  })
})
