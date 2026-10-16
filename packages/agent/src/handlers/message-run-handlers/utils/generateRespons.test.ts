import type { Chat, MessageRun } from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Tool, Toolset } from "../../../tools/types"

const mocks = vi.hoisted(() => ({
  buildConversationHistory: vi.fn(),
  createModelAdapter: vi.fn(),
  getMaxRequestPerMinute: vi.fn(),
  registerAbortController: vi.fn(),
  toConversationMessages: vi.fn(),
  unregisterAbortController: vi.fn(),
  waitForMessageRunAnswer: vi.fn(),
}))

vi.mock("../../../storage", async (importActual) => ({
  ...(await importActual<object>()),
  getMaxRequestPerMinute: mocks.getMaxRequestPerMinute,
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
import { generateResponse } from "./generateResponse"

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

  ctx.store.getAllCommands.mockResolvedValue([])
  ctx.store.getChatById.mockResolvedValue(chat)
  ctx.store.getMessageRunById.mockResolvedValue(messageRun)
  ctx.store.getMessageRunsByChat.mockResolvedValue([])
  mocks.getMaxRequestPerMinute.mockReturnValue(1000)
  ctx.store.updateMessageRun.mockImplementation((run) => Promise.resolve(run))
  mocks.buildConversationHistory.mockReturnValue([])
  mocks.toConversationMessages.mockReturnValue([])
  mocks.waitForMessageRunAnswer.mockResolvedValue("answer")
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
    mocks.waitForMessageRunAnswer.mockResolvedValueOnce("Thanks for the help")

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
      return "still waiting"
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

  it("pauses for continuation when the per-minute request limit is reached", async () => {
    mocks.getMaxRequestPerMinute.mockReturnValue(2)

    let streamCallCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        streamCallCount += 1
        yield {
          content: "",
          done: true,
          toolCalls: [{ arguments: "{}", name: "get_current_weather" }],
        }
      },
    })

    await expect(
      generateResponse(ctx, chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    // Two recorded requests fill the window, so the third round trip pauses
    // the run to ask the user for confirmation. The user answers "answer",
    // which is not the continue sentinel, so the run stops.
    expect(streamCallCount).toBe(2)
    expect(mocks.waitForMessageRunAnswer).toHaveBeenCalledWith(messageRunId)
    expect(messageRun.status).toBe("stopped")
  })

  it("resets the rate-limit window when the user chooses to continue", async () => {
    mocks.getMaxRequestPerMinute.mockReturnValue(2)
    mocks.waitForMessageRunAnswer.mockResolvedValueOnce("continue")

    let streamCallCount = 0

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        streamCallCount += 1

        if (streamCallCount <= 3) {
          yield {
            content: "",
            done: true,
            toolCalls: [{ arguments: "{}", name: "get_current_weather" }],
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

    // Two round trips fill the window, the user confirms, and the window is
    // reset so the loop keeps generating until the model stops calling tools.
    expect(streamCallCount).toBe(4)
    expect(mocks.waitForMessageRunAnswer).toHaveBeenCalledWith(messageRunId)
    expect(messageRun.status).toBe("completed")
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
