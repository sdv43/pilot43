import { beforeEach, describe, expect, it, vi } from "vitest"

describe("fetch tool", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => {
      const response = new Response("hello world", {
        headers: { "content-type": "text/plain; charset=utf-8" },
        status: 200,
        statusText: "OK",
      })

      Object.defineProperty(response, "url", {
        value: "https://example.com/",
      })

      return Promise.resolve(response)
    })
  })

  it("fetch omits verbose metadata to keep tool results compact", async () => {
    const { executeFetchTool } = await import("./fetch")
    const result = await executeFetchTool({ url: "https://example.com" })

    expect(result).toEqual({
      bodyText: "hello world",
      ok: true,
      status: 200,
      url: "https://example.com/",
    })

    expect(result).not.toHaveProperty("contentType")
    expect(result).not.toHaveProperty("durationMs")
    expect(result).not.toHaveProperty("headers")
    expect(result).not.toHaveProperty("method")
    expect(result).not.toHaveProperty("redirected")
    expect(result).not.toHaveProperty("statusText")
    expect(result).not.toHaveProperty("truncated")
  })
})
