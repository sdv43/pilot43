import { describe, expect, it } from "vitest"

import { formatEstimate } from "./utils"

describe("formatEstimate", () => {
  it("keeps sub-thousand values unchanged", () => {
    expect(formatEstimate(987, false)).toBe("987")
  })

  it("compacts exact thousands", () => {
    expect(formatEstimate(1000, false)).toBe("1k")
  })

  it("keeps one decimal place for non-round thousand values", () => {
    expect(formatEstimate(1499, false)).toBe("1.5k")
  })

  it("preserves the approximation prefix for compact values", () => {
    expect(formatEstimate(1500, true)).toBe("~1.5k")
  })
})
