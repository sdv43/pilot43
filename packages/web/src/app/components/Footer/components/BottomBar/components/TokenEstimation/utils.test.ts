import { describe, expect, it } from "vitest"

import { formatEstimate, getContextUsage } from "./utils"

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

  it("compacts millions", () => {
    expect(formatEstimate(1_047_576, false)).toBe("1M")
  })

  it("preserves the approximation prefix for compact values", () => {
    expect(formatEstimate(1500, true)).toBe("~1.5k")
  })
})

describe("getContextUsage", () => {
  it("is null without a known context window", () => {
    expect(getContextUsage(1000, undefined)).toBeNull()
  })

  it("turns high from 80%", () => {
    expect(getContextUsage(12_400, 200_000)).toEqual({
      isHigh: false,
      percent: 6,
    })
    expect(getContextUsage(171_000, 200_000)).toEqual({
      isHigh: true,
      percent: 86,
    })
  })
})
