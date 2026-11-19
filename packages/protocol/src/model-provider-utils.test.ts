import { describe, expect, it } from "vitest"

import {
  getKnownContextWindow,
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

describe("getKnownContextWindow", () => {
  it("matches the longest known prefix", () => {
    expect(getKnownContextWindow("gpt-4.1-mini")).toBe(1_047_576)
    expect(getKnownContextWindow("gpt-4-turbo")).toBe(128_000)
    expect(getKnownContextWindow("openai/gpt-5")).toBe(400_000)
    expect(getKnownContextWindow("claude-opus-5.5")).toBe(200_000)
  })

  it("returns undefined for unknown models", () => {
    expect(getKnownContextWindow("qwen3:32b")).toBeUndefined()
  })
})
