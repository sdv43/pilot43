import { describe, expect, it } from "vitest"

import { resolveModelContextWindow } from "./model-provider-handlers"

const provider = (models?: Record<string, { contextWindow?: number }>) =>
  ({
    id: "p",
    models,
    name: "Gateway",
    settings: { apiKey: "sk" },
    type: "openai",
  }) as never

describe("resolveModelContextWindow", () => {
  it("prefers the window the provider reports", () => {
    expect(
      resolveModelContextWindow(provider({ m: { contextWindow: 8000 } }), {
        contextWindow: 32_000,
        id: "m",
        name: "m",
      }),
    ).toBe(32_000)
  })

  it("uses the window entered for the model", () => {
    expect(
      resolveModelContextWindow(
        provider({ "gpt-5": { contextWindow: 128_000 } }),
        {
          id: "gpt-5",
          name: "gpt-5",
        },
      ),
    ).toBe(128_000)
  })

  it("falls back to well-known models, else unknown", () => {
    expect(
      resolveModelContextWindow(provider(), { id: "gpt-5", name: "gpt-5" }),
    ).toBe(400_000)
    expect(
      resolveModelContextWindow(provider(), {
        id: "llama-3.3-70b",
        name: "llama-3.3-70b",
      }),
    ).toBeUndefined()
  })
})
