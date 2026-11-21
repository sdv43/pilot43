import type { Chat, MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Tool, Toolset } from "../../../tools/types"

const mocks = vi.hoisted(() => ({
  buildConversationHistory: vi.fn(),
  createModelAdapter: vi.fn(),
  registerAbortController: vi.fn(),
  toConversationMessages: vi.fn(),
  unregisterAbortController: vi.fn(),
  waitForMessageRunAnswer: vi.fn(),
}))

vi.mock("../../../models", () => ({
  createModelAdapter: mocks.createModelAdapter,
}))

vi.mock("./abort-registry", () => ({
  registerAbortController: mocks.registerAbortController,
  unregisterAbortController: mocks.unregisterAbortController,
}))

vi.mock("./await-registry", () => ({
  resolveMessageRunAnswer: vi.fn(),
  waitForMessageRunAnswer: mocks.waitForMessageRunAnswer,
}))

vi.mock("./chat-history", () => ({
  buildConversationHistory: mocks.buildConversationHistory,
  toConversationMessages: mocks.toConversationMessages,
}))

import { createTestContext, type TestContext } from "../../../test-utils"
import { askFollowupQuestionTool } from "../../../tools/executors"
import {
  generateResponse,
  getProviderRetryDelay,
  getRetryableProviderError,
  isRateLimitError,
  maxProviderRetries,
} from "./generateResponse"

const chatId = "chat-1"
const messageRunId = "run-1"
const provider = {
  id: "provider-1",
  name: "OpenAI",
  settings: { apiKey: "secret" },
  type: "openai",
}

const chat: Chat = {
  createdAt: 1,
  id: chatId,
  settings: { tools: [] },
  title: "Example chat",
  updatedAt: 1,
  workspaceId: "workspace-1",
}

const weatherTool: Tool = {
  definition: {
    description: "Get the current weather",
    id: "get_current_weather",
    name: "get_current_weather",
  },
  execute: () => Promise.resolve({ forecast: "sunny", ok: true }),
  inputSchema: {
    additionalProperties: false,
    properties: {},
    required: [],
    type: "object",
  },
}

const askHelloArguments = JSON.stringify({
  follow_up: [{ text: "Hi" }],
  question: "Hello",
})

let ctx: TestContext
let messageRun: MessageRun
let toolset: Toolset

beforeEach(() => {
  vi.clearAllMocks()

  toolset = {
    providers: [],
    tools: [askFollowupQuestionTool, weatherTool],
  }
  ctx = createTestContext({ toolset })

  messageRun = {
    assistantMessages: [],
    chatId,
    createdAt: 1,
    error: null,
    id: messageRunId,
    modelMeta: {
      name: "gpt-4",
      provider: provider.id,
      settings: {},
    },
    status: "pending",
    updatedAt: 1,
    userMessage: {
      attachments: [],
      content: "Hello",
      createdAt: 1,
      id: "user-1",
      messageRunId,
      role: "user",
    },
  }

  ctx.store.getAllPrompts.mockResolvedValue([])
  ctx.store.getChatById.mockResolvedValue(chat)
  ctx.store.getMessageRunById.mockResolvedValue(messageRun)
  ctx.store.getMessageRunsByChat.mockResolvedValue([])
  ctx.store.updateMessageRun.mockImplementation((run) => Promise.resolve(run))
  mocks.buildConversationHistory.mockReturnValue([])
  mocks.toConversationMessages.mockReturnValue([])
  mocks.waitForMessageRunAnswer.mockResolvedValue({ text: "answer" })
  mocks.registerAbortController.mockImplementation(
    (_id, controller: AbortController) => controller.signal,
  )
  mocks.unregisterAbortController.mockReturnValue(undefined)
  mocks.createModelAdapter.mockReturnValue({
    chat: function* () {
      yield { content: "", done: true }
    },
  })
})

describe("generateResponse", () => {
  it("marks the run as failed and persists the error when the message run cannot be found", async () => {
    ctx.store.getMessageRunById.mockResolvedValueOnce(undefined)

    await expect(
      generateResponse(ctx, chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(ctx.store.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Message run not found",
        status: "failed",
      }),
    )
    expect(ctx.notifier.notify).toHaveBeenCalled()
    expect(mocks.createModelAdapter).not.toHaveBeenCalled()
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(
      messageRunId,
      expect.any(AbortController),
    )
  })

  it("marks the run as failed and persists the error when the chat cannot be found", async () => {
    ctx.store.getChatById.mockResolvedValueOnce(undefined)

    await expect(
      generateResponse(ctx, chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(ctx.store.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Chat not found",
        status: "failed",
      }),
    )
    expect(ctx.notifier.notify).toHaveBeenCalled()
    expect(mocks.createModelAdapter).not.toHaveBeenCalled()
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(
      messageRunId,
      expect.any(AbortController),
    )
  })

  it("marks the run as stopped and exits early when the abort signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()

    mocks.registerAbortController.mockReturnValueOnce(controller.signal)

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.status).toBe("stopped")
    expect(ctx.store.updateMessageRun).toHaveBeenCalledTimes(1)
    expect(ctx.notifier.notify).toHaveBeenCalled()
    expect(mocks.createModelAdapter).not.toHaveBeenCalled()
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(
      messageRunId,
      expect.any(AbortController),
    )
  })

  it("marks the run as stopped when the abort signal is triggered before the first loop iteration", async () => {
    let capturedController: AbortController | undefined

    mocks.registerAbortController.mockImplementation(
      (_id, controller: AbortController) => {
        capturedController = controller
        return controller.signal
      },
    )

    toolset.providers = [
      {
        resolveTools: () => {
          capturedController?.abort()
          return Promise.resolve([])
        },
      },
    ]

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.status).toBe("stopped")
    expect(ctx.store.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "stopped" }),
    )
    expect(ctx.notifier.notify).toHaveBeenCalled()
    expect(mocks.createModelAdapter).toHaveBeenCalledWith(provider, "gpt-4")
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(
      messageRunId,
      expect.any(AbortController),
    )
  })

  it("passes model settings through to the adapter chat config", async () => {
    const adapterChat = vi.fn(function* () {
      yield {
        content: "",
        done: true,
      }
    })

    mocks.createModelAdapter.mockReturnValue({
      chat: adapterChat,
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
      {
        reasoningEffort: "high",
        thinking: false,
      },
    )

    expect(adapterChat).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        reasoningEffort: "high",
        thinking: false,
      }),
    )
  })

  it("stores the user's answer for an interactive follow-up question", async () => {
    let callCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        callCount += 1

        if (callCount === 1) {
          yield {
            content: "",
            done: true,
            toolCalls: [
              {
                arguments: askHelloArguments,
                name: "ask_followup_question",
              },
            ],
          }
        } else {
          yield {
            content: "",
            done: true,
          }
        }
      },
    })
    mocks.waitForMessageRunAnswer.mockResolvedValueOnce({
      text: "Thanks for the help",
    })

    await expect(
      generateResponse(ctx, chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(mocks.waitForMessageRunAnswer).toHaveBeenCalledWith(messageRunId)
    expect(mocks.toConversationMessages).toHaveBeenCalled()
    expect(
      messageRun.assistantMessages.some(
        (entry) => entry.role === "user_answer",
      ),
    ).toBe(true)
  })

  it("handles unsupported and malformed interactive tool calls", async () => {
    let callCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        callCount += 1

        if (callCount === 1) {
          yield {
            content: "",
            done: true,
            toolCalls: [
              {
                arguments: "",
                name: "unsupported_tool",
              },
              {
                arguments: "{bad json",
                name: "ask_followup_question",
              },
            ],
          }
        } else {
          yield {
            content: "",
            done: true,
          }
        }
      },
    })

    await expect(
      generateResponse(ctx, chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(mocks.waitForMessageRunAnswer).not.toHaveBeenCalled()
    expect(mocks.createModelAdapter).toHaveBeenCalled()
  })

  it("stops gracefully when the follow-up answer wait is rejected", async () => {
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield {
          content: "",
          done: true,
          toolCalls: [
            {
              arguments: askHelloArguments,
              name: "ask_followup_question",
            },
          ],
        }
      },
    })
    mocks.waitForMessageRunAnswer.mockRejectedValueOnce(new Error("stopped"))

    await expect(
      generateResponse(ctx, chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(messageRun.followupQuestion).toBeNull()
    expect(messageRun.status).toBe("stopped")
  })

  it("stops when the run is aborted while waiting for a follow-up answer", async () => {
    let runController: AbortController | undefined

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield {
          content: "",
          done: true,
          toolCalls: [
            {
              arguments: askHelloArguments,
              name: "ask_followup_question",
            },
          ],
        }
      },
    })
    mocks.registerAbortController.mockImplementationOnce(
      (_id, controller: AbortController) => {
        runController = controller
        return controller.signal
      },
    )
    mocks.waitForMessageRunAnswer.mockImplementationOnce(() => {
      runController?.abort()
      return Promise.resolve({ text: "still waiting" })
    })

    await expect(
      generateResponse(ctx, chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(messageRun.status).toBe("stopped")
    expect(mocks.createModelAdapter).toHaveBeenCalledTimes(1)
    expect(
      messageRun.assistantMessages.some(
        (entry) => entry.role === "user_answer",
      ),
    ).toBe(false)
  })

  it("sets the run to running before continuing through the normal generation flow", async () => {
    mocks.registerAbortController.mockReturnValueOnce(
      new AbortController().signal,
    )

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.status).toBe("completed")
    expect(ctx.store.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    )
    expect(ctx.notifier.notify).toHaveBeenCalled()
    expect(mocks.createModelAdapter).toHaveBeenCalledWith(provider, "gpt-4")
  })

  it("keeps a stopped run stopped while a tool call started before the stop finishes", async () => {
    let controller: AbortController | undefined
    const saves: { aborted: boolean; status: MessageRun["status"] }[] = []

    mocks.registerAbortController.mockImplementation(
      (_id, abortController: AbortController) => {
        controller = abortController
        return abortController.signal
      },
    )
    ctx.store.updateMessageRun.mockImplementation((run: MessageRun) => {
      saves.push({
        aborted: controller?.signal.aborted ?? false,
        status: run.status,
      })
      return Promise.resolve(run)
    })
    toolset.tools = [
      {
        ...weatherTool,
        // The user stops the run while the tool is still running.
        execute: () => {
          controller?.abort()
          return Promise.resolve({ ok: true })
        },
      },
    ]
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield {
          content: "",
          done: true,
          toolCalls: [
            { arguments: "{}", id: "call-1", name: "get_current_weather" },
          ],
        }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(saves.filter((save) => save.aborted)).not.toEqual([])
    expect(
      saves.filter((save) => save.aborted && save.status !== "stopped"),
    ).toEqual([])
    expect(messageRun.status).toBe("stopped")
  })
})

describe("isRateLimitError", () => {
  it("detects HTTP 429 errors from different SDKs", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true)
    expect(isRateLimitError({ statusCode: 429 })).toBe(true)
    expect(isRateLimitError(new Error("429 Too Many Requests"))).toBe(true)
    expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true)
    expect(isRateLimitError(new Error("401 Unauthorized"))).toBe(false)
    expect(isRateLimitError("429")).toBe(false)
  })
})

describe("getRetryableProviderError", () => {
  it("detects rate limits and overload, with Retry-After", () => {
    expect(getRetryableProviderError({ status: 429 })).toEqual({
      kind: "rate_limit",
    })
    expect(getRetryableProviderError({ status: 529 })).toEqual({
      kind: "overloaded",
    })
    expect(getRetryableProviderError(new Error("Overloaded"))).toEqual({
      kind: "overloaded",
    })
    expect(
      getRetryableProviderError({
        headers: { "retry-after": "20" },
        status: 429,
      }),
    ).toEqual({ kind: "rate_limit", retryAfterMs: 20_000 })
    expect(getRetryableProviderError({ status: 401 })).toBeNull()
  })
})

describe("getProviderRetryDelay", () => {
  it("prefers Retry-After and otherwise backs off up to a minute", () => {
    expect(getProviderRetryDelay(1, 2500)).toBe(2500)
    expect(getProviderRetryDelay(1)).toBe(6000)
    expect(getProviderRetryDelay(2)).toBe(12_000)
    expect(getProviderRetryDelay(5)).toBe(60_000)
  })
})

describe("generateResponse pauses", () => {
  it("asks the user without a countdown once automatic retries run out", async () => {
    let callCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        callCount += 1

        if (callCount <= maxProviderRetries + 1) {
          throw Object.assign(new Error("Overloaded"), { status: 529 })
        }

        yield { content: "Done", done: true }
      },
    })

    const prompts: unknown[] = []
    mocks.waitForMessageRunAnswer.mockImplementation(() => {
      prompts.push({ ...messageRun.continuationPrompt })
      return Promise.resolve({ text: "continue" })
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(prompts).toHaveLength(maxProviderRetries + 1)
    expect(prompts[0]).toMatchObject({
      attempt: 1,
      message: "OpenAI: provider overloaded (529)",
    })
    expect(prompts.at(-1)).not.toHaveProperty("retryAt")
    expect(messageRun.status).toBe("completed")
    mocks.waitForMessageRunAnswer.mockReset()
  })

  it("pauses on a rate limit and retries the request when the user continues", async () => {
    let callCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        callCount += 1

        if (callCount === 1) {
          throw Object.assign(new Error("Too many requests"), { status: 429 })
        }

        yield { content: "Done", done: true }
      },
    })
    mocks.waitForMessageRunAnswer.mockImplementationOnce(() => {
      expect(messageRun.status).toBe("awaiting_input")
      expect(messageRun.continuationPrompt).toMatchObject({
        attempt: 1,
        kind: "rate_limit",
        maxAttempts: 3,
        message: "OpenAI: rate limit reached (429)",
        retryAt: expect.any(Number) as number,
      })

      return Promise.resolve({ text: "continue" })
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(callCount).toBe(2)
    expect(messageRun.status).toBe("completed")
    expect(messageRun.continuationPrompt).toBeNull()
    expect(messageRun.assistantMessages).toHaveLength(1)
    expect(messageRun.assistantMessages[0]).toMatchObject({ content: "Done" })
  })

  it("stops the run when the user does not continue after a rate limit", async () => {
    mocks.createModelAdapter.mockReturnValue({
      // eslint-disable-next-line require-yield
      chat: function* () {
        throw Object.assign(new Error("Too many requests"), { status: 429 })
      },
    })
    mocks.waitForMessageRunAnswer.mockResolvedValueOnce({ text: "stop" })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.status).toBe("stopped")
    expect(messageRun.error).toBeNull()
  })

  it("asks to continue after many tool round trips in a row", async () => {
    let callCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        callCount += 1

        yield {
          content: "",
          done: true,
          toolCalls:
            callCount <= 25
              ? [
                  {
                    arguments: "{}",
                    id: `call-${callCount}`,
                    name: "unknown_tool",
                  },
                ]
              : undefined,
        }
      },
    })
    mocks.waitForMessageRunAnswer.mockImplementationOnce(() => {
      expect(callCount).toBe(25)
      expect(messageRun.continuationPrompt).toMatchObject({
        kind: "tool_limit",
        message: "The assistant has made 25 tool calls in a row. Continue?",
        toolCallCount: 25,
      })

      return Promise.resolve({ text: "continue" })
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(mocks.waitForMessageRunAnswer).toHaveBeenCalledTimes(1)
    expect(callCount).toBe(26)
    expect(messageRun.status).toBe("completed")
  })

  it("adds the workspace system prompt to the conversation", async () => {
    ctx.store.getWorkspaceById.mockResolvedValue({
      id: "workspace-1",
      lastSelectedChatId: null,
      name: "Work",
      systemPrompt: "Answer in French.",
    })
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield { content: "", done: true }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(mocks.buildConversationHistory.mock.calls[0][0]).toContain(
      "<workspace_instructions>\nAnswer in French.\n</workspace_instructions>",
    )
  })

  it("adds tool provider instructions before the workspace system prompt", async () => {
    ctx.store.getWorkspaceById.mockResolvedValue({
      id: "workspace-1",
      lastSelectedChatId: null,
      name: "Work",
      systemPrompt: "Answer in French.",
    })
    toolset.providers = [
      {
        resolveInstructions: () =>
          Promise.resolve([
            { source: "mcp__figma", text: "Load figma-use first." },
          ]),
        resolveTools: () => Promise.resolve([]),
      },
    ]
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield { content: "", done: true }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    const systemPrompt = mocks.buildConversationHistory.mock
      .calls[0][0] as string

    expect(systemPrompt).toContain(
      '<tool_instructions source="mcp__figma">\nLoad figma-use first.\n</tool_instructions>',
    )
    expect(systemPrompt.indexOf("<tool_instructions")).toBeLessThan(
      systemPrompt.indexOf("<workspace_instructions>"),
    )
  })
})

describe("tool approval", () => {
  function mockWeatherCall() {
    let callCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        callCount += 1

        yield {
          content: callCount === 1 ? "" : "Done",
          done: true,
          toolCalls:
            callCount === 1
              ? [{ arguments: "{}", id: "call-1", name: "get_current_weather" }]
              : undefined,
        }
      },
    })
  }

  function askingWorkspace() {
    return {
      id: "workspace-1",
      lastSelectedChatId: null,
      name: "Work",
      toolPermissions: { builtin: { level: "ask" as const, tools: {} } },
    }
  }

  it("runs tools without asking when the workspace allows them", async () => {
    mockWeatherCall()

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(mocks.waitForMessageRunAnswer).not.toHaveBeenCalled()
    expect(messageRun.assistantMessages[0]).toMatchObject({
      tools: [{ approval: "allowed", status: "completed" }],
    })
  })

  it("does not offer tools disabled in the workspace to the model", async () => {
    const adapterChat = vi.fn(function* (
      _messages: unknown,
      _config: { tools?: { name: string }[] },
    ) {
      yield { content: "Done", done: true }
    })

    mocks.createModelAdapter.mockReturnValue({ chat: adapterChat })
    ctx.store.getWorkspaceById.mockResolvedValue({
      ...askingWorkspace(),
      toolPermissions: {
        builtin: {
          level: "allow" as const,
          tools: { get_current_weather: "disabled" as const },
        },
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    const config = adapterChat.mock.calls[0]?.[1]

    expect(config?.tools?.map((tool) => tool.name) ?? []).not.toContain(
      "get_current_weather",
    )
  })

  it("pauses for approval and runs the tool when allowed once", async () => {
    ctx.store.getWorkspaceById.mockResolvedValue(askingWorkspace())
    mockWeatherCall()
    mocks.waitForMessageRunAnswer.mockImplementationOnce(() => {
      expect(messageRun.status).toBe("awaiting_input")
      expect(messageRun.toolApproval).toEqual({
        toolCallId: "call-1",
        toolName: "get_current_weather",
      })

      return Promise.resolve({ text: "allow_once" })
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.toolApproval).toBeNull()
    expect(messageRun.status).toBe("completed")
    expect(messageRun.assistantMessages[0]).toMatchObject({
      tools: [
        {
          approval: "approved",
          result: { forecast: "sunny", ok: true },
          status: "completed",
        },
      ],
    })
    expect(ctx.store.updateWorkspace).not.toHaveBeenCalled()
  })

  it("records a denied call without running it", async () => {
    ctx.store.getWorkspaceById.mockResolvedValue(askingWorkspace())
    mockWeatherCall()
    mocks.waitForMessageRunAnswer.mockResolvedValueOnce({ text: "deny" })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.assistantMessages[0]).toMatchObject({
      tools: [
        {
          result: { error: "The user denied this tool call.", ok: false },
          status: "denied",
        },
      ],
    })
    expect(messageRun.status).toBe("completed")
  })

  it("denies the call and passes a typed reply to the model as feedback", async () => {
    ctx.store.getWorkspaceById.mockResolvedValue(askingWorkspace())
    const seen: { content: string; role: string }[][] = []
    let callCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* (messages: { content: string; role: string }[]) {
        callCount += 1
        seen.push(messages.map(({ content, role }) => ({ content, role })))

        yield {
          content: callCount === 1 ? "" : "Done",
          done: true,
          toolCalls:
            callCount === 1
              ? [{ arguments: "{}", id: "call-1", name: "get_current_weather" }]
              : undefined,
        }
      },
    })
    mocks.waitForMessageRunAnswer.mockResolvedValueOnce({
      text: "deny\nUse the forecast for Berlin instead",
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.assistantMessages[0]).toMatchObject({
      tools: [{ status: "denied" }],
    })
    expect(messageRun.assistantMessages[1]).toMatchObject({
      content: "Use the forecast for Berlin instead",
      role: "user_answer",
    })
    expect(seen[1]?.at(-1)).toEqual({
      content: "Use the forecast for Berlin instead",
      role: "user",
    })
    expect(messageRun.status).toBe("completed")
  })

  it("switches the tool to always allow in the workspace", async () => {
    ctx.store.getWorkspaceById.mockResolvedValue(askingWorkspace())
    mockWeatherCall()
    mocks.waitForMessageRunAnswer.mockResolvedValueOnce({
      text: "always_allow",
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(ctx.store.updateWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        toolPermissions: {
          builtin: {
            level: "ask",
            tools: { get_current_weather: "allow" },
          },
        },
      }),
    )
  })

  it("never asks before interactive hidden tools", async () => {
    ctx.store.getWorkspaceById.mockResolvedValue(askingWorkspace())
    let callCount = 0
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        callCount += 1
        yield {
          content: "",
          done: true,
          toolCalls:
            callCount === 1
              ? [
                  {
                    arguments: askHelloArguments,
                    name: "ask_followup_question",
                  },
                ]
              : undefined,
        }
      },
    })
    mocks.waitForMessageRunAnswer.mockImplementationOnce(() => {
      expect(messageRun.toolApproval).toBeFalsy()
      expect(messageRun.followupQuestion).toMatchObject({ question: "Hello" })

      return Promise.resolve({
        answers: [{ header: "Question", question: "Hello", selected: ["Hi"] }],
        text: "Hi",
      })
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(mocks.waitForMessageRunAnswer).toHaveBeenCalledTimes(1)
    expect(
      messageRun.assistantMessages.find(
        (entry) => entry.role === "user_answer",
      ),
    ).toMatchObject({
      answers: [{ header: "Question", question: "Hello", selected: ["Hi"] }],
      content: "Hi",
    })
  })
})

describe("chat state", () => {
  it("marks the chat as generating and stores a preview when done", async () => {
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield { content: "**Seven** open issues found.", done: true }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(ctx.store.updateChatState).toHaveBeenCalledWith(chatId, {
      isGenerating: true,
      preview: undefined,
    })
    expect(ctx.store.updateChatState).toHaveBeenLastCalledWith(chatId, {
      isGenerating: false,
      preview: "Seven open issues found.",
    })
    expect(messageRun.completedAt).toEqual(expect.any(Number))
  })
})

describe("streaming", () => {
  it("sends the streamed text in notifications and saves it only on the first and final chunk", async () => {
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield { content: "Hel", done: false }
        yield { content: "lo", done: false }
        yield { content: " there", done: false }
        yield { content: "", done: true, finishReason: "stop" }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    const streamed = ctx.notifier.notify.mock.calls
      .map(([notification]) => notification)
      .filter((notification) => notification.action === "messageRunStreamed")

    expect(streamed.length).toBeGreaterThan(0)
    expect(streamed[0]).toMatchObject({
      payload: { chatId, message: { content: "Hello" }, messageRunId },
    })
    // Running, first chunk, end of stream and completion.
    expect(ctx.store.updateMessageRun).toHaveBeenCalledTimes(4)
    expect(messageRun.assistantMessages[0]).toMatchObject({
      content: "Hello there",
    })
    expect(messageRun.status).toBe("completed")
  })

  it("passes the chat id as the session id", async () => {
    const chatSpy = vi.fn(function* () {
      yield { content: "", done: true }
    })
    mocks.createModelAdapter.mockReturnValue({ chat: chatSpy })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(chatSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sessionId: chatId }),
    )
  })

  it("marks a reply cut off by the output token limit", async () => {
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield { content: "Partial", done: false }
        yield { content: "", done: true, finishReason: "length" }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.status).toBe("completed")
    expect(messageRun.assistantMessages[0]).toMatchObject({ truncated: true })
  })

  it("fails the run when the stream ends before the reply finished", async () => {
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield { content: "Partial", done: false }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.status).toBe("failed")
    expect(messageRun.error).toMatch(/ended unexpectedly/)
    expect(messageRun.assistantMessages[0]).toMatchObject({
      content: "Partial",
    })
  })

  it("keeps reasoning details on the reply", async () => {
    const details = [{ index: 0, text: "Thinking", type: "reasoning.text" }]
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield { content: "", done: true, reasoningDetails: details }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(messageRun.assistantMessages[0]).toMatchObject({
      reasoningDetails: details,
    })
  })
})

describe("tool round trips", () => {
  it("explains cut-off tool arguments to the model", async () => {
    let request = 0
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        request += 1
        yield request === 1
          ? {
              content: "",
              done: true,
              finishReason: "length",
              toolCalls: [
                {
                  arguments: '{"city": "Par',
                  id: "call-1",
                  name: "get_current_weather",
                },
              ],
            }
          : { content: "Done", done: true }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    const [first] = messageRun.assistantMessages
    expect(first).toMatchObject({ truncated: true })
    expect(first?.role === "assistant" && first.tools[0]).toMatchObject({
      result: {
        error: expect.stringMatching(/cut off .* output token limit/) as string,
        ok: false,
      },
      status: "failed",
    })
    expect(messageRun.status).toBe("completed")
  })

  it("refuses a call repeated with the same arguments in three round trips in a row", async () => {
    const execute = vi.fn(() =>
      Promise.resolve({ forecast: "sunny", ok: true }),
    )
    toolset.tools = [{ ...weatherTool, execute, validateArgs: () => {} }]
    let request = 0
    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        request += 1
        yield request <= 3
          ? {
              content: "",
              done: true,
              toolCalls: [
                {
                  // Key order differs between round trips.
                  arguments:
                    request === 2 ? '{"b": 2, "a": 1}' : '{"a": 1, "b": 2}',
                  id: `call-${request}`,
                  name: "get_current_weather",
                },
              ],
            }
          : { content: "Done", done: true }
      },
    })

    await generateResponse(
      ctx,
      chatId,
      messageRunId,
      "gpt-4",
      provider as never,
    )

    expect(execute).toHaveBeenCalledTimes(2)
    const third = messageRun.assistantMessages[2]
    expect(third?.role === "assistant" && third.tools[0]).toMatchObject({
      result: {
        error: expect.stringMatching(/already made/) as string,
        ok: false,
      },
      status: "failed",
    })
  })
})
