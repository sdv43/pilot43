import type { MessageAssistantTool } from "@pilot43/protocol"

import { describe, expect, it } from "vitest"

import type { AgentStep } from "./types"

import {
  countFailedSteps,
  describeToolStep,
  getStepSources,
  getStepsSummary,
  isStepActive,
} from "./utils"

function toolStep(
  name: string,
  fields: Partial<MessageAssistantTool> = {},
): AgentStep {
  return {
    id: name,
    kind: "tool",
    tool: {
      args: {},
      name,
      result: { ok: true },
      status: "completed",
      ...fields,
    },
  }
}

const thought: AgentStep = {
  id: "th",
  isThinking: false,
  kind: "thought",
  thoughts: "…",
}
const note: AgentStep = { content: "Let me check.", id: "n", kind: "note" }

describe("getStepsSummary", () => {
  it("names the server when all calls come from one", () => {
    expect(
      getStepsSummary([
        thought,
        toolStep("mcp__github__search_issues"),
        note,
        toolStep("mcp__github__get_issue"),
        thought,
      ]),
    ).toBe("2 github calls · 2 thoughts")
    expect(getStepsSummary([toolStep("mcp__github__get_issue")])).toBe(
      "1 github call",
    )
  })

  it("falls back to tool calls and steps", () => {
    expect(
      getStepsSummary([toolStep("mcp__github__get_issue"), toolStep("fetch")]),
    ).toBe("2 tool calls")
    expect(getStepsSummary([toolStep("fetch"), toolStep("fetch")])).toBe(
      "2 tool calls",
    )
    expect(getStepsSummary([note, note])).toBe("2 steps")
  })
})

describe("getStepSources", () => {
  it("lists servers first, then tools and thoughts, up to the limit", () => {
    expect(
      getStepSources([
        thought,
        toolStep("mcp__github__a"),
        toolStep("fetch"),
        toolStep("mcp__github__b"),
        toolStep("mcp__figma__c"),
      ]),
    ).toEqual([
      { kind: "server", name: "github" },
      { kind: "server", name: "figma" },
      { kind: "tools" },
    ])
    expect(getStepSources([thought, toolStep("fetch")])).toEqual([
      { kind: "tools" },
      { kind: "thoughts" },
    ])
  })
})

describe("countFailedSteps / isStepActive", () => {
  it("reads tool states", () => {
    const failed = toolStep("fetch", {
      result: { ok: false },
      status: "failed",
    })
    const running = toolStep("fetch", { result: null, status: "running" })

    expect(countFailedSteps([failed, running, thought])).toBe(1)
    expect(isStepActive(running)).toBe(true)
    expect(isStepActive(running, false)).toBe(false)
    expect(isStepActive({ ...thought, isThinking: true })).toBe(true)
    expect(isStepActive(note)).toBe(false)
  })
})

describe("describeToolStep", () => {
  it("drops “Completed” from finished calls", () => {
    expect(
      describeToolStep({
        args: {},
        durationMs: 812,
        name: "fetch",
        result: { items: [1, 2, 3], ok: true },
        status: "completed",
      }),
    ).toBe("3 results · 0.8s")
    expect(
      describeToolStep({
        args: {},
        name: "fetch",
        result: { ok: true },
        status: "completed",
      }),
    ).toBe("Done")
    expect(
      describeToolStep({
        args: {},
        durationMs: 400,
        name: "fetch",
        result: { ok: false },
        status: "failed",
      }),
    ).toBe("Failed · 0.4s")
  })
})
