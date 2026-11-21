import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ list: vi.fn(), show: vi.fn() }))

vi.mock("ollama/browser", () => ({
  Ollama: class {
    list = mocks.list
    show = mocks.show
  },
}))

import { getOllamaContextWindow, OllamaAdapter } from "./ollama-adapter"

const adapter = () =>
  new OllamaAdapter(
    {
      id: "ollama",
      name: "Ollama",
      settings: { host: "http://localhost:11434" },
      type: "ollama",
    } as never,
    "",
  )

beforeEach(() => {
  mocks.list.mockReset()
  mocks.show.mockReset()
  mocks.list.mockResolvedValue({
    models: [{ model: "llama3.3", name: "llama3.3" }, { name: "broken" }],
  })
  mocks.show.mockImplementation(({ model }: { model: string }) =>
    model === "broken"
      ? Promise.reject(new Error("not found"))
      : Promise.resolve({
          model_info: { "llama.context_length": 131_072 },
          parameters: "",
        }),
  )
})

describe("getOllamaContextWindow", () => {
  it("prefers the num_ctx the Modelfile sets", () => {
    expect(
      getOllamaContextWindow({
        model_info: { "qwen3.context_length": 40_960 },
        parameters: "temperature 0.6\nnum_ctx 8192\nstop <|im_end|>",
      }),
    ).toBe(8192)
  })

  it("falls back to the model's maximum, from an object or a Map", () => {
    expect(
      getOllamaContextWindow({
        model_info: { "gemma3.context_length": 131_072, "gemma3.vocab": 1 },
      }),
    ).toBe(131_072)
    expect(
      getOllamaContextWindow({
        model_info: new Map([["llama.context_length", 8192]]),
      }),
    ).toBe(8192)
  })

  it("is undefined without either", () => {
    expect(getOllamaContextWindow({ model_info: {}, parameters: "" })).toBe(
      undefined,
    )
  })
})

describe("OllamaAdapter.listModels", () => {
  it("looks context windows up only when asked", async () => {
    expect(await adapter().listModels()).toEqual([
      { id: "llama3.3", name: "llama3.3" },
      { id: "broken", name: "broken" },
    ])
    expect(mocks.show).not.toHaveBeenCalled()

    expect(await adapter().listModels({ contextWindows: true })).toEqual([
      { contextWindow: 131_072, id: "llama3.3", name: "llama3.3" },
      { id: "broken", name: "broken" },
    ])
  })
})
