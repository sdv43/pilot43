import { describe, expect, it } from "vitest"

import type { MessageRun } from "@/shared/api"

import { getActiveMessageRun, getLastMessageRun } from "./utils"

function createMessageRun(overrides: Partial<MessageRun>): MessageRun {
  const createdAt = overrides.createdAt ?? Date.now()

  return {
    id: overrides.id ?? "mr-1",
    chatId: "chat-1",
    userMessage: {
      id: "user-1",
      role: "user",
      attachments: [],
      messageRunId: overrides.id ?? "mr-1",
      content: "Hello",
      createdAt,
    },
    assistantMessages: [],
    status: "completed",
    error: null,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    modelMeta: {
      name: "gpt-4.1",
      provider: "provider-1",
      settings: {},
    },
    ...overrides,
  }
}

describe("footer utils", () => {
  it("returns the last message run by createdAt instead of updatedAt", () => {
    const olderButUpdatedLater = createMessageRun({
      id: "older",
      createdAt: 10,
      updatedAt: 300,
    })
    const newerRun = createMessageRun({
      id: "newer",
      createdAt: 20,
      updatedAt: 100,
    })

    expect(getLastMessageRun([olderButUpdatedLater, newerRun])?.id).toBe(
      "newer",
    )
  })

  it("returns the latest run when it is pending or running", () => {
    expect(
      getActiveMessageRun([
        createMessageRun({ id: "pending", status: "pending" }),
      ])?.id,
    ).toBe("pending")

    expect(
      getActiveMessageRun([
        createMessageRun({ id: "running", status: "running" }),
      ])?.id,
    ).toBe("running")
  })

  it("ignores older active runs when the latest run has already finished", () => {
    const olderRunning = createMessageRun({
      id: "older-running",
      createdAt: 10,
      status: "running",
    })
    const latestCompleted = createMessageRun({
      id: "latest-completed",
      createdAt: 20,
      status: "completed",
    })

    expect(getActiveMessageRun([olderRunning, latestCompleted])).toBeNull()
  })
})
