import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Chat, MessageRun } from "@/shared/api"

const mocks = vi.hoisted(() => ({
  buildConversationHistory: vi.fn(),
  createModelAdapter: vi.fn(),
  executeInteractiveToolCalls: vi.fn(),
  executeToolCalls: vi.fn(),
  getAllCommands: vi.fn(),
  getChatById: vi.fn(),
  getEnabledToolDefinitionsAsync: vi.fn(),
  getEnabledTools: vi.fn(),
  getMaxRequestPerMinute: vi.fn(),
  getMessageRunById: vi.fn(),
  getMessageRunsByChat: vi.fn(),
  notifySidepanel: vi.fn(),
  registerAbortController: vi.fn(),
  toConversationMessages: vi.fn(),
  unregisterAbortController: vi.fn(),
  updateMessageRun: vi.fn(),
  waitForMessageRunAnswer: vi.fn(),
}))

vi.mock("@/offscreen/storage", () => ({
  getAllCommands: mocks.getAllCommands,
  getChatById: mocks.getChatById,
  getMaxRequestPerMinute: mocks.getMaxRequestPerMinute,
  getMessageRunById: mocks.getMessageRunById,
  getMessageRunsByChat: mocks.getMessageRunsByChat,
  updateMessageRun: mocks.updateMessageRun,
}))

vi.mock("@/offscreen/models", () => ({
  createModelAdapter: mocks.createModelAdapter,
}))

vi.mock("@/offscreen/tools/runtime", () => ({
  askFollowupQuestionToolName: "ask_followup_question",
  buildInteractiveToolResult: vi.fn(
    (toolCall: { name: string }, _args, result: unknown) => ({
      name: toolCall.name,
      result,
    }),
  ),
  executeInteractiveToolCalls: mocks.executeInteractiveToolCalls,
  executeToolCalls: mocks.executeToolCalls,
  getEnabledToolDefinitionsAsync: mocks.getEnabledToolDefinitionsAsync,
  getEnabledTools: mocks.getEnabledTools,
  isInteractiveTool: vi.fn(
    (name: string) =>
      name === "ask_followup_question" || name === "unsupported_tool",
  ),
  parseAskFollowupQuestionArgs: vi.fn((args: Record<string, unknown>) => ({
    followUp: [],
    question: (args.question as string | undefined) ?? "Question",
  })),
}))

vi.mock("./abort-registry", () => ({
  registerAbortController: mocks.registerAbortController,
  unregisterAbortController: mocks.unregisterAbortController,
}))

vi.mock("./await-registry", () => ({
  waitForMessageRunAnswer: mocks.waitForMessageRunAnswer,
}))

vi.mock("./notifySidepanel", () => ({
  notifySidepanel: mocks.notifySidepanel,
}))

vi.mock("./chat-history", () => ({
  buildConversationHistory: mocks.buildConversationHistory,
  toConversationMessages: mocks.toConversationMessages,
}))

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

let messageRun: MessageRun

beforeEach(() => {
  vi.clearAllMocks()

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

  mocks.getAllCommands.mockResolvedValue([])
  mocks.getChatById.mockResolvedValue(chat)
  mocks.getMessageRunById.mockResolvedValue(messageRun)
  mocks.getMessageRunsByChat.mockResolvedValue([])
  mocks.getMaxRequestPerMinute.mockReturnValue(1000)
  mocks.updateMessageRun.mockResolvedValue(undefined)
  mocks.executeInteractiveToolCalls.mockImplementation(
    async (
      interactiveCalls: Array<{ arguments?: string; name: string }>,
      assistantMessage: { tools: Array<unknown> },
      messageRun: MessageRun,
      chatId: string,
      _signal: AbortSignal,
      persistMessageRunUpdate: (
        chatId: string,
        messageRun: MessageRun,
      ) => Promise<void>,
    ) => {
      const conversationMessages: Array<{ content: string; role: string }> = []

      for (const toolCall of interactiveCalls) {
        if (toolCall.name === "ask_followup_question") {
          let question: string

          try {
            const parsedArgs = JSON.parse(toolCall.arguments ?? "{}") as Record<
              string,
              unknown
            >
            question = (parsedArgs.question as string | undefined) ?? "Question"
          } catch {
            assistantMessage.tools.push({
              name: toolCall.name,
              result: { error: "Invalid JSON", ok: false },
            })
            continue
          }

          messageRun.followupQuestion = {
            followUp: [],
            question,
          }
          messageRun.status = "awaiting_input"

          assistantMessage.tools.push({
            name: toolCall.name,
            result: {
              awaitingInput: true,
              ok: true,
              question,
            },
          })

          try {
            const answer = (await mocks.waitForMessageRunAnswer(
              messageRun.id,
            )) as string

            messageRun.assistantMessages.push({
              content: answer,
              createdAt: Date.now(),
              id: crypto.randomUUID(),
              messageRunId: messageRun.id,
              role: "user_answer",
            })
            messageRun.followupQuestion = null
            messageRun.status = "running"
            conversationMessages.push({ content: answer, role: "user" })
            await persistMessageRunUpdate(chatId, messageRun)

            return {
              conversationMessages,
              shouldStop: false,
            }
          } catch {
            messageRun.followupQuestion = null
            messageRun.status = "stopped"
            await persistMessageRunUpdate(chatId, messageRun)

            return {
              conversationMessages,
              shouldStop: true,
            }
          }
        } else {
          assistantMessage.tools.push({
            name: toolCall.name,
            result: {
              error: `Tool \`${toolCall.name}\` is not implemented.`,
              ok: false,
            },
          })
        }
      }

      return {
        conversationMessages,
        shouldStop: false,
      }
    },
  )
  mocks.executeToolCalls.mockResolvedValue([])
  mocks.getEnabledToolDefinitionsAsync.mockResolvedValue([])
  mocks.getEnabledTools.mockResolvedValue([])
  mocks.buildConversationHistory.mockReturnValue([])
  mocks.toConversationMessages.mockReturnValue([])
  mocks.notifySidepanel.mockReturnValue(undefined)
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
    mocks.getMessageRunById.mockResolvedValueOnce(null)

    await expect(
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(mocks.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Message run not found",
        status: "failed",
      }),
    )
    expect(mocks.notifySidepanel).toHaveBeenCalled()
    expect(mocks.createModelAdapter).not.toHaveBeenCalled()
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(messageRunId)
  })

  it("marks the run as failed and persists the error when the chat cannot be found", async () => {
    mocks.getChatById.mockResolvedValueOnce(null)

    await expect(
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(mocks.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Chat not found",
        status: "failed",
      }),
    )
    expect(mocks.notifySidepanel).toHaveBeenCalled()
    expect(mocks.createModelAdapter).not.toHaveBeenCalled()
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(messageRunId)
  })

  it("marks the run as stopped and exits early when the abort signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()

    mocks.registerAbortController.mockReturnValueOnce(controller.signal)

    await generateResponse(chatId, messageRunId, "gpt-4", provider as never)

    expect(messageRun.status).toBe("stopped")
    expect(mocks.updateMessageRun).toHaveBeenCalledTimes(1)
    expect(mocks.notifySidepanel).toHaveBeenCalled()
    expect(mocks.createModelAdapter).not.toHaveBeenCalled()
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(messageRunId)
  })

  it("marks the run as stopped when the abort signal is triggered before the first loop iteration", async () => {
    let capturedController: AbortController | undefined

    mocks.registerAbortController.mockImplementation(
      (_id, controller: AbortController) => {
        capturedController = controller
        return controller.signal
      },
    )

    mocks.getEnabledTools.mockImplementationOnce(() => {
      capturedController?.abort()
      return Promise.resolve([])
    })

    await generateResponse(chatId, messageRunId, "gpt-4", provider as never)

    expect(messageRun.status).toBe("stopped")
    expect(mocks.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "stopped" }),
    )
    expect(mocks.notifySidepanel).toHaveBeenCalled()
    expect(mocks.createModelAdapter).toHaveBeenCalledWith(provider, "gpt-4")
    expect(mocks.unregisterAbortController).toHaveBeenCalledWith(messageRunId)
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
                arguments: '{"question":"Hello"}',
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
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
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
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
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
              arguments: '{"question":"Hello"}',
              name: "ask_followup_question",
            },
          ],
        }
      },
    })
    mocks.waitForMessageRunAnswer.mockRejectedValueOnce(new Error("stopped"))

    await expect(
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(messageRun.followupQuestion).toBeNull()
    expect(messageRun.status).toBe("stopped")
  })

  it("stops when the run is aborted while waiting for a follow-up answer", async () => {
    const controller = new AbortController()

    mocks.createModelAdapter.mockReturnValue({
      chat: function* () {
        yield {
          content: "",
          done: true,
          toolCalls: [
            {
              arguments: '{"question":"Hello"}',
              name: "ask_followup_question",
            },
          ],
        }
      },
    })
    mocks.registerAbortController.mockImplementationOnce(
      (_id, signalController: AbortController) => {
        controller.abort()
        return signalController.signal
      },
    )
    mocks.waitForMessageRunAnswer.mockImplementationOnce(() => {
      controller.abort()
      return "still waiting"
    })

    await expect(
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
    ).resolves.toBeUndefined()

    expect(messageRun.status).toBe("stopped")
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
    mocks.executeToolCalls.mockResolvedValue([
      { name: "get_current_weather", result: "sunny" },
    ])

    await expect(
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
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
    mocks.executeToolCalls.mockResolvedValue([
      { name: "get_current_weather", result: "sunny" },
    ])

    await expect(
      generateResponse(chatId, messageRunId, "gpt-4", provider as never),
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

    await generateResponse(chatId, messageRunId, "gpt-4", provider as never)

    expect(messageRun.status).toBe("completed")
    expect(mocks.updateMessageRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    )
    expect(mocks.notifySidepanel).toHaveBeenCalled()
    expect(mocks.createModelAdapter).toHaveBeenCalledWith(provider, "gpt-4")
  })
})
