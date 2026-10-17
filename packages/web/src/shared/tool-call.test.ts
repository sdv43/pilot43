import { describe, expect, it } from "vitest"

import {
  describeToolCall,
  formatDuration,
  formatToolName,
  getToolCallState,
} from "./tool-call"

describe("tool call helpers", () => {
  it("formats MCP and built-in tool names", () => {
    expect(formatToolName("mcp__github__search_issues")).toBe(
      "github · search_issues",
    )
    expect(formatToolName("fetch")).toBe("fetch")
  })

  it("infers the state of calls saved without a status", () => {
    expect(getToolCallState({ args: {}, name: "x", result: null })).toBe(
      "running",
    )
    expect(
      getToolCallState({
        args: {},
        name: "x",
        result: { error: "no", ok: false },
      }),
    ).toBe("failed")
    expect(
      getToolCallState({ args: {}, name: "x", result: { ok: true } }),
    ).toBe("completed")
  })

  it("describes calls", () => {
    expect(
      describeToolCall({
        args: {},
        durationMs: 812,
        name: "mcp__github__search_issues",
        result: { items: [1, 2, 3, 4, 5, 6, 7], ok: true },
        status: "completed",
      }),
    ).toBe("Completed · 0.8s · 7 results")
    expect(
      describeToolCall({
        args: {},
        durationMs: 400,
        name: "x",
        result: { error: "401 Unauthorized\nmore", ok: false },
        status: "failed",
      }),
    ).toBe("Failed · 0.4s")
    expect(
      describeToolCall(
        {
          args: {},
          name: "x",
          result: null,
          startedAt: 1000,
          status: "running",
        },
        3400,
      ),
    ).toBe("Running · 2.4s")
  })

  it("formats durations", () => {
    expect(formatDuration(5200)).toBe("5.2s")
    expect(formatDuration(14_000)).toBe("14s")
    expect(formatDuration(125_000)).toBe("2m 5s")
  })
})
