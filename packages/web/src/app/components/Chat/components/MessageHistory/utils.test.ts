import type { MessageAssistant, MessageRun } from "@pilot43/protocol"

import { describe, expect, it } from "vitest"

import { canResumeRun, isRunTruncated } from "./utils"

function makeAssistant(
  overrides: Partial<MessageAssistant> = {},
): MessageAssistant {
  return {
    content: "Answer",
    createdAt: 2,
    id: "a1",
    messageRunId: "run-1",
    role: "assistant",
    tools: [],
    ...overrides,
  }
}

function makeRun(overrides: Partial<MessageRun> = {}): MessageRun {
  return {
    assistantMessages: [],
    chatId: "chat-1",
    createdAt: 1,
    error: null,
    id: "run-1",
    modelMeta: { name: "m", provider: "p", settings: {} },
    status: "stopped",
    updatedAt: 1,
    userMessage: {
      attachments: [],
      content: "Hi",
      createdAt: 1,
      id: "u1",
      messageRunId: "run-1",
      role: "user",
    },
    ...overrides,
  }
}

const withToolCall = makeAssistant({
  tools: [{ args: {}, name: "fetch", result: { ok: true } }],
})

describe("canResumeRun", () => {
  it("allows the last stopped or failed run that made tool calls", () => {
    expect(
      canResumeRun(makeRun({ assistantMessages: [withToolCall] }), true),
    ).toBe(true)
    expect(
      canResumeRun(
        makeRun({ assistantMessages: [withToolCall], status: "failed" }),
        true,
      ),
    ).toBe(true)
  })

  it("leaves other runs to Retry", () => {
    expect(
      canResumeRun(makeRun({ assistantMessages: [withToolCall] }), false),
    ).toBe(false)
    expect(
      canResumeRun(makeRun({ assistantMessages: [makeAssistant()] }), true),
    ).toBe(false)
    expect(
      canResumeRun(
        makeRun({ assistantMessages: [withToolCall], status: "completed" }),
        true,
      ),
    ).toBe(false)
  })
})

describe("isRunTruncated", () => {
  it("checks the final reply of a completed run", () => {
    expect(
      isRunTruncated(
        makeRun({
          assistantMessages: [makeAssistant({ truncated: true })],
          status: "completed",
        }),
      ),
    ).toBe(true)
    expect(
      isRunTruncated(
        makeRun({
          assistantMessages: [
            makeAssistant({ truncated: true }),
            makeAssistant({ id: "a2" }),
          ],
          status: "completed",
        }),
      ),
    ).toBe(false)
  })
})
