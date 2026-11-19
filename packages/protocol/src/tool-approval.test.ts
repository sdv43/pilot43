import { describe, expect, it } from "vitest"

import { encodeToolDenial, parseToolApprovalAnswer } from "./tool-approval"

describe("tool approval answers", () => {
  it("round-trips a denial with feedback", () => {
    expect(
      parseToolApprovalAnswer(encodeToolDenial("  Make it shorter\nPlease ")),
    ).toEqual({ decision: "deny", feedback: "Make it shorter\nPlease" })
  })

  it("keeps plain answers", () => {
    expect(parseToolApprovalAnswer("allow_once")).toEqual({
      decision: "allow_once",
    })
    expect(parseToolApprovalAnswer("always_allow")).toEqual({
      decision: "always_allow",
    })
    expect(parseToolApprovalAnswer("deny")).toEqual({ decision: "deny" })
    expect(encodeToolDenial("   ")).toBe("deny")
  })
})
