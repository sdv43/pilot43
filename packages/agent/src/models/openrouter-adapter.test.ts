import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ChatMessage, StreamChunk } from "./types"

const mocks = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock("@openrouter/sdk", () => ({
  OpenRouter: class {
    chat = { send: mocks.send }
  },
}))

import { mergeReasoningDetail, OpenRouterAdapter } from "./openrouter-adapter"

function createAdapter(modelName: string) {
  return new OpenRouterAdapter(
    {
      id: "provider-1",
      name: "OpenRouter",
      settings: { apiKey: "sk" },
      type: "openrouter",
    } as never,
    modelName,
  )
}

function stream(chunks: unknown[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield await Promise.resolve(chunk)
      }
    },
  }
}

async function collect(iterable: AsyncIterable<StreamChunk>) {
  const chunks: StreamChunk[] = []

  for await (const chunk of iterable) {
    chunks.push(chunk)
  }

  return chunks
}

const messages: ChatMessage[] = [
  { content: "System", role: "system" },
  { content: "Hi", role: "user" },
  {
    content: "",
    reasoning: { details: [{ text: "Plan", type: "reasoning.text" }] },
    role: "assistant",
    toolCalls: [{ arguments: "{}", id: "call-1", name: "fetch" }],
  },
  { content: "{}", role: "tool", toolCallId: "call-1", toolName: "fetch" },
]

beforeEach(() => {
  mocks.send.mockReset()
  mocks.send.mockResolvedValue(
    stream([
      {
        choices: [
          {
            delta: {
              reasoningDetails: [
                { index: 0, text: "Let me ", type: "reasoning.text" },
              ],
            },
            finishReason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              reasoningDetails: [
                {
                  index: 0,
                  signature: "sig",
                  text: "think",
                  type: "reasoning.text",
                },
              ],
            },
            finishReason: "length",
          },
        ],
      },
      { choices: [], usage: { completionTokens: 5, promptTokens: 10 } },
    ]),
  )
})

describe("OpenRouterAdapter", () => {
  it("reports the finish reason and the merged reasoning details", async () => {
    const chunks = await collect(createAdapter("openai/gpt-5").chat(messages))

    expect(chunks.at(-1)).toMatchObject({
      done: true,
      finishReason: "length",
      reasoningDetails: [
        {
          index: 0,
          signature: "sig",
          text: "Let me think",
          type: "reasoning.text",
        },
      ],
    })
  })

  it("sends reasoning back and the chat as the session", async () => {
    await collect(
      createAdapter("openai/gpt-5").chat(messages, { sessionId: "chat-1" }),
    )

    const { chatRequest } = mocks.send.mock.calls[0]?.[0] as {
      chatRequest: Record<string, unknown> & { messages: unknown[] }
    }

    expect(chatRequest.sessionId).toBe("chat-1")
    expect(chatRequest.cacheControl).toBeUndefined()
    expect(chatRequest.messages[0]).toEqual({
      content: "System",
      role: "system",
    })
    expect(chatRequest.messages[2]).toMatchObject({
      reasoningDetails: [{ text: "Plan", type: "reasoning.text" }],
    })
  })

  it("adds cache breakpoints for Anthropic models", async () => {
    await collect(createAdapter("anthropic/claude-sonnet-5.5").chat(messages))

    const { chatRequest } = mocks.send.mock.calls[0]?.[0] as {
      chatRequest: Record<string, unknown> & { messages: unknown[] }
    }

    expect(chatRequest.cacheControl).toEqual({ type: "ephemeral" })
    expect(chatRequest.messages[0]).toEqual({
      content: [
        {
          cacheControl: { type: "ephemeral" },
          text: "System",
          type: "text",
        },
      ],
      role: "system",
    })
  })
})

describe("mergeReasoningDetail", () => {
  it("keeps blocks with other indexes or types apart", () => {
    const details: Record<string, unknown>[] = []

    mergeReasoningDetail(details, {
      index: 0,
      text: "a",
      type: "reasoning.text",
    })
    mergeReasoningDetail(details, {
      index: 0,
      summary: "s",
      type: "reasoning.summary",
    })
    mergeReasoningDetail(details, {
      index: 1,
      text: "b",
      type: "reasoning.text",
    })
    mergeReasoningDetail(details, { data: "x", type: "reasoning.encrypted" })

    expect(details).toHaveLength(4)
  })
})
