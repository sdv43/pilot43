import { describe, expect, it } from "vitest"

import {
  getModelProviderModelId,
  parseModelProviderModelId,
} from "./model-provider-utils"

describe("getModelProviderModelId", () => {
  it("builds a provider/model identifier string", () => {
    expect(getModelProviderModelId("openai", "gpt-4o")).toBe("openai::gpt-4o")
  })
})

describe("parseModelProviderModelId", () => {
  it("parses a valid provider/model identifier", () => {
    expect(parseModelProviderModelId("openai::gpt-4o")).toEqual({
      modelName: "gpt-4o",
      providerId: "openai",
    })
  })

  it("returns an empty result when the separator is missing", () => {
    expect(parseModelProviderModelId("openai")).toEqual({})
  })

  it("returns an empty result when either half is empty", () => {
    expect(parseModelProviderModelId("::gpt-4o")).toEqual({})
    expect(parseModelProviderModelId("openai::")).toEqual({})
  })
})
