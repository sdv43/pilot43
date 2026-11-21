import { describe, expect, it } from "vitest"

import { formatTokenCount } from "./format-tokens"

describe("formatTokenCount", () => {
  it("compacts thousands and millions", () => {
    expect(formatTokenCount(950)).toBe("950")
    expect(formatTokenCount(12_400)).toBe("12.4k")
    expect(formatTokenCount(400_000)).toBe("400k")
    expect(formatTokenCount(999_960)).toBe("1M")
    expect(formatTokenCount(1_047_576)).toBe("1M")
    expect(formatTokenCount(1_500_000)).toBe("1.5M")
  })
})
