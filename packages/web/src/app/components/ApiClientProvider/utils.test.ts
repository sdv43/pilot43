import type { MessageRun } from "@pilot43/protocol"

import { describe, expect, it } from "vitest"

import { applyStreamedMessage } from "./utils"

function makeRun(content: string): MessageRun {
  return {
    assistantMessages: [
      {
        content,
        createdAt: 2,
        id: "a1",
        messageRunId: "run-1",
        role: "assistant",
        tools: [],
      },
    ],
    chatId: "chat-1",
    createdAt: 1,
    error: null,
    id: "run-1",
    modelMeta: { name: "m", provider: "p", settings: {} },
    status: "running",
    updatedAt: 1,
    userMessage: {
      attachments: [],
      content: "Hi",
      createdAt: 1,
      id: "u1",
      messageRunId: "run-1",
      role: "user",
    },
  }
}

describe("applyStreamedMessage", () => {
  it("patches the streamed message in place", () => {
    const other = { ...makeRun("Other"), id: "run-0" }
    const runs = [other, makeRun("Hel")]

    const patched = applyStreamedMessage(runs, "run-1", {
      content: "Hello",
      id: "a1",
      thoughts: "Hmm",
    })

    expect(patched?.[0]).toBe(other)
    expect(patched?.[1]?.assistantMessages[0]).toMatchObject({
      content: "Hello",
      thoughts: "Hmm",
    })
    expect(runs[1]?.assistantMessages[0]?.content).toBe("Hel")
  })

  it("keeps text a refetch already has", () => {
    const runs = [makeRun("Hello there")]

    expect(
      applyStreamedMessage(runs, "run-1", { content: "Hello", id: "a1" }),
    ).toBe(runs)
  })

  it("asks for a refetch when the message is not loaded", () => {
    expect(
      applyStreamedMessage([makeRun("")], "run-1", { content: "x", id: "a2" }),
    ).toBeUndefined()
    expect(
      applyStreamedMessage(undefined, "run-1", { content: "x", id: "a1" }),
    ).toBeUndefined()
  })
})
