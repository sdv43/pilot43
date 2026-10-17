import { describe, expect, it } from "vitest"

import type { ModelProviderModels } from "../../../../../../../queries/modelProvider"

import { filterModelGroups, getModelDetail, getModelDisplayName } from "./utils"

const groups = [
  {
    models: [
      { id: "b::m2", name: "beta-2", providerId: "b" },
      { id: "b::m1", name: "beta-1", providerId: "b" },
    ],
    provider: { id: "b", name: "Beta" },
  },
  {
    models: [{ id: "a::m1", name: "alpha-1", providerId: "a" }],
    provider: { id: "a", name: "Alpha" },
  },
  { error: "offline", models: [], provider: { id: "c", name: "Ollama" } },
] as ModelProviderModels[]

describe("filterModelGroups", () => {
  it("sorts groups and models and keeps failed groups", () => {
    expect(
      filterModelGroups(groups, "").map((group) => [
        group.provider.name,
        group.models.map((model) => model.name),
      ]),
    ).toEqual([
      ["Alpha", ["alpha-1"]],
      ["Beta", ["beta-1", "beta-2"]],
      ["Ollama", []],
    ])
  })

  it("filters models by name", () => {
    expect(
      filterModelGroups(groups, "BETA-2").map((group) =>
        group.models.map((model) => model.id),
      ),
    ).toEqual([["b::m2"]])
  })
})

describe("model names", () => {
  it("splits vendor prefixes", () => {
    expect(getModelDisplayName("anthropic/claude-opus-5.5")).toBe(
      "claude-opus-5.5",
    )
    expect(getModelDetail({ name: "anthropic/claude-opus-5.5" })).toBe(
      "anthropic/claude-opus-5.5",
    )
    expect(getModelDetail({ name: "gpt-5" })).toBeUndefined()
  })
})
