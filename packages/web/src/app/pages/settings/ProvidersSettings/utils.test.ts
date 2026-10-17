import { describe, expect, it } from "vitest"

import { getProviderDetail, getProviderStatus } from "./utils"

describe("getProviderStatus", () => {
  it("labels connection results", () => {
    expect(getProviderStatus(undefined, true).label).toBe("Checking…")
    expect(getProviderStatus({ message: "", success: true }, false)).toEqual({
      label: "Connected",
      tone: "success",
    })
    expect(
      getProviderStatus(
        { message: "401 Incorrect API key", success: false },
        false,
      ).label,
    ).toBe("Invalid key")
    expect(
      getProviderStatus({ message: "fetch failed", success: false }, false)
        .label,
    ).toBe("Offline")
  })
})

describe("getProviderDetail", () => {
  it("masks keys and shows hosts and model counts", () => {
    expect(
      getProviderDetail(
        {
          id: "p1",
          name: "OpenAI",
          settings: {
            apiKey: "sk-proj-abc91c0",
            host: "https://llm.acme.dev/v1",
          },
          type: "openai",
        },
        { message: "", models: ["a", "b"], success: true },
      ),
    ).toBe("•••• 91c0 · llm.acme.dev/v1 · 2 models")
    expect(
      getProviderDetail(
        {
          id: "p2",
          name: "Ollama",
          settings: { host: "http://localhost:11434" },
          type: "ollama",
        },
        undefined,
      ),
    ).toBe("localhost:11434")
  })
})
