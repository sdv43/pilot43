import { describe, expect, it } from "vitest"

import { getThinkingPreview, getThinkingSummary } from "./utils"

describe("getThinkingSummary", () => {
  it("formats seconds and minutes", () => {
    expect(getThinkingSummary(undefined)).toBe("Thoughts")
    expect(getThinkingSummary(300)).toBe("Thought for 1 s")
    expect(getThinkingSummary(12_400)).toBe("Thought for 12 s")
    expect(getThinkingSummary(125_000)).toBe("Thought for 2 min 5 s")
  })
})

describe("getThinkingPreview", () => {
  it("keeps short thoughts and trims long ones to the last words", () => {
    expect(getThinkingPreview("one  two\nthree")).toBe("one two three")
    expect(getThinkingPreview("alpha beta gamma delta", 12)).toBe(
      "…gamma delta",
    )
  })
})
