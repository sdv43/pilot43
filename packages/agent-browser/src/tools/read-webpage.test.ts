import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@mozilla/readability", () => ({
  isProbablyReaderable: () => true,
  Readability: class {
    parse() {
      return {
        byline: null,
        content: "<article><h1>Example</h1><p>Hello world</p></article>",
        dir: "ltr",
        excerpt: "Hello world",
        lang: "en",
        length: 11,
        publishedTime: null,
        siteName: null,
        textContent: "Hello world",
        title: "Example",
      }
    }
  },
}))

describe("read_webpage tool", () => {
  beforeEach(() => {
    globalThis.window = {
      clearTimeout,
      setTimeout,
    } as typeof window

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

    globalThis.DOMParser = class {
      parseFromString(_html: string) {
        return {
          documentElement: { firstChild: null },
          head: {
            prepend: vi.fn(),
            querySelector: () => null,
          },
        } as unknown as Document
      }
    }
  })

  it("read_webpage keeps only the compact article summary", async () => {
    const { executeReadWebpageTool } = await import("./read-webpage")
    const result = await executeReadWebpageTool({
      html: "<html><body><article><h1>Example</h1><p>Hello world</p></article></body></html>",
    })

    expect(result).toEqual({
      excerpt: "Hello world",
      source: "html",
      textContent: "Hello world",
      title: "Example",
      url: null,
    })

    expect(result).not.toHaveProperty("content")
    expect(result).not.toHaveProperty("contentType")
    expect(result).not.toHaveProperty("dir")
    expect(result).not.toHaveProperty("lang")
    expect(result).not.toHaveProperty("siteName")
  })
})
