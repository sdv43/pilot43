import { describe, expect, it } from "vitest"

import {
  changeProviderType,
  createProviderDraft,
  describeModelLevels,
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
