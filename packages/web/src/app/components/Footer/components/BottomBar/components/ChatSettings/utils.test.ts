import { describe, expect, it } from "vitest"

import { countDisabledTools, getToolsChipLabel } from "./utils"

describe("countDisabledTools", () => {
  it("counts tools disabled per tool or per group, skipping hidden ones", () => {
    expect(
      countDisabledTools(
        {
          builtin: { level: "allow", tools: { fetch: "disabled" } },
          mcp: {
            github: { level: "ask", tools: { delete_repo: "disabled" } },
          },
        },
        [{ name: "fetch" }, { hidden: true, name: "secret" }],
        {
          github: [{ name: "delete_repo" }, { name: "list_issues" }],
          linear: [{ name: "list_issues" }],
        },
      ),
    ).toBe(2)
  })
})

describe("getToolsChipLabel", () => {
  it("counts enabled servers", () => {
    expect(getToolsChipLabel(0)).toBe("Tools")
    expect(getToolsChipLabel(3)).toBe("3 servers")
  })
})
