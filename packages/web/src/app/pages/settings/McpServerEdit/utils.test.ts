import { describe, expect, it } from "vitest"

import { draftToMcpServer, validateMcpServerDraft } from "./utils"

const linear = {
  name: "linear",
  type: "http" as const,
  url: "https://mcp.linear.app/mcp",
}

describe("draftToMcpServer", () => {
  it("drops empty headers and keeps extra config", () => {
    expect(
      draftToMcpServer(
        {
          headers: [
            { id: "1", name: "Authorization", value: "Bearer x" },
            { id: "2", name: " ", value: "ignored" },
          ],
          name: " linear ",
          url: "https://mcp.linear.app/mcp",
        },
        { ...linear, timeoutMs: 5000 },
      ),
    ).toEqual({
      headers: { Authorization: "Bearer x" },
      name: "linear",
      timeoutMs: 5000,
      type: "http",
      url: "https://mcp.linear.app/mcp",
    })
  })
})

describe("validateMcpServerDraft", () => {
  it("requires a unique name and an http(s) URL", () => {
    expect(
      validateMcpServerDraft(
        { headers: [], name: "linear", url: "ftp://x" },
        [linear],
        undefined,
      ),
    ).toEqual({
      name: "A server with this name already exists",
      url: "Use an http(s) URL",
    })
    expect(
      validateMcpServerDraft(
        { headers: [], name: "linear", url: "https://mcp.linear.app/mcp" },
        [linear],
        "linear",
      ),
    ).toEqual({})
  })
})
