import { describe, expect, it } from "vitest"

import type { McpServer } from "@/shared/api"

import { documentToServers, serversToDocument } from "./utils"

describe("McpSettingsForm utils", () => {
  it("preserves extra fields when serializing servers into the editor document", () => {
    const servers: McpServer[] = [
      {
        name: "github",
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: {
          Authorization: "Bearer token",
        },
        sessionId: "session-1",
      },
    ]

    expect(serversToDocument(servers)).toEqual({
      servers: {
        github: {
          type: "http",
          url: "https://api.githubcopilot.com/mcp/",
          headers: {
            Authorization: "Bearer token",
          },
          sessionId: "session-1",
        },
      },
    })
  })

  it("preserves extra fields when parsing the editor document back into servers", () => {
    expect(
      documentToServers({
        servers: {
          github: {
            type: "http",
            url: "https://api.githubcopilot.com/mcp/",
            headers: {
              Authorization: "Bearer token",
            },
            sessionId: "session-1",
          },
        },
      }),
    ).toEqual([
      {
        name: "github",
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: {
          Authorization: "Bearer token",
        },
        sessionId: "session-1",
      },
    ])
  })

  it("defaults missing server type to http when parsing editor documents", () => {
    expect(
      documentToServers({
        servers: {
          github: {
            url: "https://api.githubcopilot.com/mcp/",
            headers: {
              Authorization: "Bearer token",
            },
          },
        },
      }),
    ).toEqual([
      {
        name: "github",
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: {
          Authorization: "Bearer token",
        },
      },
    ])
  })
})
