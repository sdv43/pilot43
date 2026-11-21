import type { MessageAssistant, MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AgentContext } from "../../context"

import { createAgentStore, createMemoryStorage } from "../../storage"
import {
  handleChatMessageRunResume,
  interruptedToolResult,
  prepareRunForResume,
} from "./handleChatMessageRunResume"

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

function makeAssistant(
  id: string,
  overrides: Partial<MessageAssistant> = {},
): MessageAssistant {
  return {
    content: "",
    createdAt: 2,
    id,
    messageRunId: "run-1",
    role: "assistant",
    tools: [],
    ...overrides,
  }
}

async function createRun(overrides: Partial<MessageRun> = {}) {
  const workspace = await ctx.store.createWorkspace({ name: "Work" })
  const chat = await ctx.store.createChat(workspace.id, "Chat", { tools: [] })
  const provider = await ctx.store.createModelProvider({
    name: "OpenAI",
    settings: { apiKey: "sk" },
    type: "openai",
  } as never)

  return await ctx.store.createMessageRun({
    assistantMessages: [
      makeAssistant("a1", {
        tools: [
          {
            args: {},
            id: "call-1",
            name: "fetch",
            result: { ok: true },
            status: "completed",
          },
        ],
      }),
    ],
    chatId: chat.id,
    createdAt: 1,
    error: null,
    id: "run-1",
    interrupted: true,
    modelMeta: { name: "m", provider: provider.id, settings: {} },
    status: "stopped",
    updatedAt: 1,
    userMessage: {
      attachments: [],
      content: "Do it",
      createdAt: 1,
      id: "u1",
      messageRunId: "run-1",
      role: "user",
    },
    ...overrides,
  })
}

describe("handleChatMessageRunResume", () => {
  it("keeps the run's history and generates from where it ended", async () => {
    const run = await createRun()

    await handleChatMessageRunResume(ctx, run.id)

    const saved = await ctx.store.getMessageRunById(run.id)

    expect(saved?.status).toBe("pending")
    expect(saved?.interrupted).toBeUndefined()
    expect(saved?.assistantMessages).toHaveLength(1)
    expect(mocks.generateResponse).toHaveBeenCalledOnce()
  })

  it("refuses runs that are not stopped or failed", async () => {
    const run = await createRun({ status: "completed" })

    await expect(handleChatMessageRunResume(ctx, run.id)).rejects.toThrow(
      /stopped or failed/,
    )
    expect(mocks.generateResponse).not.toHaveBeenCalled()
  })

  it("refuses a run that is not the chat's last", async () => {
    const run = await createRun()
    await ctx.store.createMessageRun({
      ...run,
      createdAt: 5,
      id: "run-2",
      userMessage: { ...run.userMessage, id: "u2", messageRunId: "run-2" },
    })

    await expect(handleChatMessageRunResume(ctx, run.id)).rejects.toThrow(
      /last run/,
    )
  })
})

describe("prepareRunForResume", () => {
  it("drops a last reply without tool calls and reports unfinished calls as interrupted", () => {
    const run = {
      assistantMessages: [
        makeAssistant("a1", {
          tools: [
            {
              args: {},
              id: "call-1",
              name: "fetch",
              result: null,
              status: "running",
            },
            {
              args: {},
              id: "call-2",
              name: "fetch",
              result: { ok: true },
              status: "completed",
            },
          ],
        }),
        makeAssistant("a2", { content: "Partial answer" }),
      ],
    } as MessageRun

    prepareRunForResume(run)

    expect(run.assistantMessages.map(({ id }) => id)).toEqual(["a1"])
    expect((run.assistantMessages[0] as MessageAssistant).tools).toMatchObject([
      { result: interruptedToolResult, status: "failed" },
      { result: { ok: true }, status: "completed" },
    ])
  })
})
