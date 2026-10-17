import { describe, expect, it } from "vitest"

import { addTag } from "./utils"

describe("addTag", () => {
  it("adds trimmed, unique tags", () => {
    expect(addTag(["low"], " high ")).toEqual(["low", "high"])
    expect(addTag(["low"], "low")).toEqual(["low"])
    expect(addTag(["low"], "  ")).toEqual(["low"])
  })
})
