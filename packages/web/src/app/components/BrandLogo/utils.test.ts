import { describe, expect, it } from "vitest"

import {
  getModelBrand,
  getNameBrand,
  getProviderBrand,
  getUrlBrand,
} from "./utils"

describe("getNameBrand", () => {
  it("finds a brand in an MCP server name", () => {
    expect(getNameBrand("github")).toBe("github")
    expect(getNameBrand("Figma-dev")).toBe("figma")
    expect(getNameBrand("filesystem")).toBeNull()
  })
})

describe("getModelBrand", () => {
  it("uses the vendor prefix", () => {
    expect(getModelBrand("anthropic/claude-opus-5.5", "openrouter")).toBe(
      "anthropic",
    )
    expect(getModelBrand("openai/gpt-5", "openrouter")).toBe("openai")
  })

  it("recognises model families without a prefix", () => {
    expect(getModelBrand("gpt-5-mini", "openai")).toBe("openai")
    expect(getModelBrand("o4-mini", "openai")).toBe("openai")
    expect(getModelBrand("claude-sonnet-5.5", "openai")).toBe("anthropic")
  })

  it("uses Ollama for local models and nothing for unknown vendors", () => {
    expect(getModelBrand("qwen3:32b", "ollama")).toBe("ollama")
    expect(getModelBrand("google/gemini-3-pro", "openrouter")).toBeNull()
  })
})

describe("getProviderBrand", () => {
  it("maps provider types", () => {
    expect(getProviderBrand("openrouter")).toBe("openrouter")
    expect(getProviderBrand("custom")).toBeNull()
  })
})

describe("getUrlBrand", () => {
  it("matches well-known hosts and subdomains", () => {
    expect(getUrlBrand("https://api.githubcopilot.com/mcp/")).toBe("github")
    expect(getUrlBrand("https://mcp.linear.app/mcp")).toBe("linear")
    expect(getUrlBrand("https://www.figma.com/design/x")).toBe("figma")
  })

  it("returns null for unknown or invalid URLs", () => {
    expect(getUrlBrand("http://localhost:3920/mcp")).toBeNull()
    expect(getUrlBrand("not a url")).toBeNull()
    expect(getUrlBrand(undefined)).toBeNull()
  })
})
