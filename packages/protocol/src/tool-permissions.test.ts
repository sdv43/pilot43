import { describe, expect, it } from "vitest"

import {
  getToolPermissionGroup,
  renameMcpServerInWorkspace,
  resolveToolPermission,
  setToolPermission,
  setToolPermissionGroupLevel,
} from "./tool-permissions"

const github = { server: "github", type: "mcp" } as const
const builtin = { type: "builtin" } as const

describe("tool permissions", () => {
  it("allows built-in tools and asks for MCP tools by default", () => {
    expect(resolveToolPermission(undefined, builtin, "read_webpage")).toBe(
      "allow",
    )
    expect(resolveToolPermission(undefined, github, "create_issue")).toBe("ask")
  })

  it("uses a tool override over the group level", () => {
    const permissions = setToolPermission(
      undefined,
      github,
      "list_issues",
      "allow",
    )

    expect(resolveToolPermission(permissions, github, "list_issues")).toBe(
      "allow",
    )
    expect(resolveToolPermission(permissions, github, "create_issue")).toBe(
      "ask",
    )
  })

  it("drops an override that matches the group level", () => {
    const allowed = setToolPermission(undefined, github, "list_issues", "allow")
    const reset = setToolPermission(allowed, github, "list_issues", "ask")

    expect(getToolPermissionGroup(reset, github).tools).toEqual({})
  })

  it("resets overrides when the group level changes", () => {
    const allowed = setToolPermission(undefined, github, "list_issues", "allow")
    const permissions = setToolPermissionGroupLevel(allowed, github, "allow")

    expect(permissions.mcp?.github).toEqual({ level: "allow", tools: {} })
  })

  it("keeps other groups untouched", () => {
    const permissions = setToolPermissionGroupLevel(
      setToolPermissionGroupLevel(undefined, builtin, "ask"),
      github,
      "allow",
    )

    expect(permissions).toEqual({
      builtin: { level: "ask", tools: {} },
      mcp: { github: { level: "allow", tools: {} } },
    })
  })
})

describe("renameMcpServerInWorkspace", () => {
  it("moves the allowlist entry and permissions to the new name", () => {
    expect(
      renameMcpServerInWorkspace(
        {
          mcpServers: ["github", "linear"],
          toolPermissions: {
            mcp: {
              github: {
                level: "ask",
                tools: { mcp__github__list_issues: "allow" },
              },
            },
          },
        },
        "github",
        "gh",
      ),
    ).toEqual({
      mcpServers: ["gh", "linear"],
      toolPermissions: {
        mcp: {
          gh: { level: "ask", tools: { mcp__gh__list_issues: "allow" } },
        },
      },
    })
  })
})
