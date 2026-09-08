import { describe, expect, it } from "vitest"

import { twoLetters } from "./utils"

describe("twoLetters", () => {
  it("uses the first two letters of the first word and keeps the second letter lowercase", () => {
    expect(twoLetters("Chat 1")).toBe("Ch")
    expect(twoLetters("Саня и Петя")).toBe("Са")
  })

  it("returns a single capitalized letter for a one-letter first word", () => {
    expect(twoLetters("A")).toBe("A")
  })
})
