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
  waitForMessageRunAnswer: mocks.waitForMessageRunAnswer,
}))

vi.mock("./chat-history", () => ({
  buildConversationHistory: mocks.buildConversationHistory,
  toConversationMessages: mocks.toConversationMessages,
}))

import { createTestContext, type TestContext } from "../../../test-utils"
import { askFollowupQuestionTool } from "../../../tools/executors"
import { generateResponse, isRateLimitError } from "./generateResponse"

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

describe("generateResponse pauses", () => {
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
      expect(messageRun.continuationPrompt).toEqual({
        kind: "rate_limit",
        message:
          "OpenAI rate limit reached (429). Wait a moment, then continue.",
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
