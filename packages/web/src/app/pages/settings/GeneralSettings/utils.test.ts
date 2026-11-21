import { describe, expect, it } from "vitest"

import {
  countChatsToDelete,
  getRetentionSelectOptions,
  summaryThresholdSelectOptions,
  valueToSummaryThreshold,
} from "./utils"

const day = 24 * 60 * 60 * 1000
const now = 1000 * day
const chat = (ageDays: number, pinned = false) => ({
  settings: { pinned, tools: [] },
  updatedAt: now - ageDays * day,
})

describe("chat history preview", () => {
  const chats = [chat(10), chat(45), chat(60), chat(60, true), chat(200)]

  it("counts unpinned chats older than the period", () => {
    expect(countChatsToDelete(chats, 30, now)).toBe(3)
    expect(countChatsToDelete(chats, 180, now)).toBe(1)
    expect(countChatsToDelete(chats, null, now)).toBe(0)
  })

  it("adds the count to shorter periods only", () => {
    expect(
      getRetentionSelectOptions([chat(10), chat(45)], now).map(
        (option) => option.label,
      ),
    ).toEqual([
      "30 days · deletes 1 chat",
      "90 days",
      "180 days",
      "Never delete",
    ])
  })
})

describe("summary threshold", () => {
  it("offers shares of the context window", () => {
    expect(summaryThresholdSelectOptions.map(({ label }) => label)).toEqual([
      "At 60%",
      "At 70%",
      "At 80%",
      "At 90%",
    ])
  })

  it("falls back to the default for unknown values", () => {
    expect(valueToSummaryThreshold("70")).toBe(70)
    expect(valueToSummaryThreshold("55")).toBe(80)
  })
})
