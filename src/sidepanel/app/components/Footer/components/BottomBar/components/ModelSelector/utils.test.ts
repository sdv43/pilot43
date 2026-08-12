import { describe, expect, it } from "vitest"

import type { ModelProviderModels } from "@/sidepanel/queries/modelProvider"

import { getSelectorOptions } from "./utils"

describe("getSelectorOptions", () => {
  it("sorts provider groups and models by name", () => {
    const modelProviderGroups = [
      {
        provider: { id: "provider-b", name: "Beta Provider" },
        models: [
          { id: "model-b-2", name: "Beta Model 2" },
          { id: "model-b-1", name: "Beta Model 1" },
        ],
      },
      {
        provider: { id: "provider-a", name: "Alpha Provider" },
        models: [
          { id: "model-a-2", name: "Alpha Model 2" },
          { id: "model-a-1", name: "Alpha Model 1" },
        ],
      },
    ] as ModelProviderModels[]

    const options = getSelectorOptions(modelProviderGroups, null)

    expect(options.map((group) => group.label)).toEqual([
      "Alpha Provider",
      "Beta Provider",
    ])

    expect(options[0]).toMatchObject({
      id: "provider-a",
      options: [
        { label: "Alpha Model 1", value: "model-a-1" },
        { label: "Alpha Model 2", value: "model-a-2" },
      ],
    })

    expect(options[1]).toMatchObject({
      id: "provider-b",
      options: [
        { label: "Beta Model 1", value: "model-b-1" },
        { label: "Beta Model 2", value: "model-b-2" },
      ],
    })
  })

  it("filters groups and models by search query", () => {
    const modelProviderGroups = [
      {
        provider: { id: "provider-a", name: "Alpha Provider" },
        models: [
          { id: "model-a-1", name: "Alpha Model 1" },
          { id: "model-a-2", name: "Gamma Model" },
        ],
      },
      {
        provider: { id: "provider-b", name: "Beta Provider" },
        models: [{ id: "model-b-1", name: "Beta Model" }],
      },
    ] as ModelProviderModels[]

    const options = getSelectorOptions(modelProviderGroups, null, "gamma")

    expect(options).toEqual([
      {
        id: "provider-a",
        label: "Alpha Provider",
        options: [
          { label: "Gamma Model", title: "Gamma Model", value: "model-a-2" },
        ],
        error: undefined,
      },
    ])
  })

  it("keeps provider groups that only have an error", () => {
    const modelProviderGroups = [
      {
        provider: { id: "provider-a", name: "Alpha Provider" },
        models: [],
        error: "Cannot load models",
      },
    ] as ModelProviderModels[]

    const options = getSelectorOptions(modelProviderGroups, null)

    expect(options).toEqual([
      {
        id: "provider-a",
        label: "Alpha Provider",
        options: [],
        error: "Cannot load models",
      },
    ])
  })

  it("keeps provider errors visible while filtering", () => {
    const modelProviderGroups = [
      {
        provider: { id: "provider-a", name: "Alpha Provider" },
        models: [],
        error: "Cannot load models",
      },
    ] as ModelProviderModels[]

    const options = getSelectorOptions(modelProviderGroups, null, "gamma")

    expect(options).toEqual([
      {
        id: "provider-a",
        label: "Alpha Provider",
        options: [],
        error: "Cannot load models",
      },
    ])
  })
})
