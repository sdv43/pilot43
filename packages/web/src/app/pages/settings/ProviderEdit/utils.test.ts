import { describe, expect, it } from "vitest"

import {
  changeProviderType,
  createProviderDraft,
  describeModel,
  describeModelLevels,
  parseContextWindow,
  parseProviderType,
  setModelContextWindow,
  setModelLevels,
} from "./utils"

describe("setModelLevels", () => {
  it("keeps a valid default and replaces a removed one", () => {
    const models = setModelLevels(undefined, "gpt-5", ["low", "high"], "high")

    expect(models["gpt-5"].reasoning).toEqual({
      defaultEffort: "high",
      supportedEfforts: ["low", "high"],
    })
    expect(setModelLevels(models, "gpt-5", ["low"])["gpt-5"].reasoning).toEqual(
      {
        defaultEffort: "low",
        supportedEfforts: ["low"],
      },
    )
  })

  it("prefers medium as the default", () => {
    expect(
      setModelLevels(undefined, "m", ["low", "medium", "max"])["m"].reasoning
        ?.defaultEffort,
    ).toBe("medium")
  })

  it("clears the default when no levels are left", () => {
    expect(setModelLevels(undefined, "m", [])["m"].reasoning).toEqual({
      defaultEffort: null,
      supportedEfforts: [],
    })
  })
})

describe("describeModelLevels", () => {
  it("summarises levels", () => {
    expect(describeModelLevels(undefined)).toBe("No reasoning")
    expect(
      describeModelLevels({
        reasoning: { defaultEffort: "high", supportedEfforts: ["low", "high"] },
      }),
    ).toBe("low, high · default high")
  })
})

describe("changeProviderType", () => {
  it("renames default names and keeps custom ones", () => {
    expect(
      changeProviderType(createProviderDraft("openai"), "ollama").name,
    ).toBe("Ollama")
    expect(
      changeProviderType(
        { ...createProviderDraft("openai"), name: "Acme gateway" },
        "openrouter",
      ),
    ).toMatchObject({ name: "Acme gateway", type: "openrouter" })
  })
})

describe("parseProviderType", () => {
  it("accepts known provider types only", () => {
    expect(parseProviderType("ollama")).toBe("ollama")
    expect(parseProviderType("anthropic")).toBeUndefined()
    expect(parseProviderType(null)).toBeUndefined()
  })
})

describe("context window", () => {
  it("parses plain, grouped and compact values", () => {
    expect(parseContextWindow("")).toBeUndefined()
    expect(parseContextWindow("  ")).toBeUndefined()
    expect(parseContextWindow("128000")).toBe(128_000)
    expect(parseContextWindow("128,000")).toBe(128_000)
    expect(parseContextWindow("128 000")).toBe(128_000)
    expect(parseContextWindow("128k")).toBe(128_000)
    expect(parseContextWindow("1.5M")).toBe(1_500_000)
  })

  it("rejects text and out-of-range values", () => {
    expect(parseContextWindow("lots")).toBeNull()
    expect(parseContextWindow("-5")).toBeNull()
    expect(parseContextWindow("500")).toBeNull()
    expect(parseContextWindow("1000M")).toBeNull()
  })

  it("sets and clears it without touching the levels", () => {
    const withLevels = setModelLevels(undefined, "m", ["low", "high"])
    const withWindow = setModelContextWindow(withLevels, "m", 128_000)

    expect(withWindow.m).toEqual({ ...withLevels.m, contextWindow: 128_000 })
    expect(setModelContextWindow(withWindow, "m", undefined).m).toEqual(
      withLevels.m,
    )
    // Changing the levels keeps the window.
    expect(setModelLevels(withWindow, "m", ["low"]).m?.contextWindow).toBe(
      128_000,
    )
  })

  it("is part of the model summary", () => {
    expect(describeModel("my-model", { contextWindow: 128_000 })).toBe(
      "No reasoning · 128k context",
    )
    expect(describeModel("gpt-4.1", undefined)).toBe(
      "No reasoning · 1M context",
    )
    expect(describeModel("my-model", undefined)).toBe(
      "No reasoning · context unknown",
    )
  })
})
