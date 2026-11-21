import type { MessageAssistantTool } from "@pilot43/protocol"

import type { AgentStep } from "./types"

import {
  countToolResults,
  describeToolCall,
  formatDuration,
  getToolCallState,
  parseToolName,
} from "../../../../../../../shared/tool-call"

/** Rows the live timeline keeps; older steps roll up into a counter. */
export const LIVE_STEP_COUNT = 3

/** True while the step itself shows progress (spinner). */
export function isStepActive(step: AgentStep, isRunActive = true) {
  if (step.kind === "thought") {
    return step.isThinking
  }

  return (
    step.kind === "tool" &&
    getToolCallState(step.tool, isRunActive) === "running"
  )
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

function getStepTools(steps: AgentStep[]) {
  return steps.flatMap((step) => (step.kind === "tool" ? [step.tool] : []))
}

/**
 * One-line summary of folded steps: `3 github calls · 2 thoughts`. Calls are
 * named after their server when they all come from one.
 */
export function getStepsSummary(steps: AgentStep[]) {
  const tools = getStepTools(steps)
  const thoughts = steps.filter((step) => step.kind === "thought").length
  const servers = new Set(tools.map((tool) => parseToolName(tool.name).server))
  const [server] = servers
  const parts: string[] = []

  if (tools.length > 0) {
    const source = servers.size === 1 && server ? server : "tool"

    parts.push(
      `${tools.length} ${source} ${tools.length === 1 ? "call" : "calls"}`,
    )
  }

  if (thoughts > 0) {
    parts.push(plural(thoughts, "thought"))
  }

  return parts.length > 0 ? parts.join(" · ") : plural(steps.length, "step")
}

export function countFailedSteps(steps: AgentStep[], isRunActive = true) {
  return getStepTools(steps).filter(
    (tool) => getToolCallState(tool, isRunActive) === "failed",
  ).length
}

export type StepSource =
  { kind: "server"; name: string } | { kind: "thoughts" } | { kind: "tools" }

const sourceOrder: StepSource["kind"][] = ["server", "tools", "thoughts"]

/**
 * Distinct sources of the steps for the summary's icons: servers in
 * first-use order, then built-in tools, then thoughts.
 */
export function getStepSources(steps: AgentStep[], max = 3): StepSource[] {
  const sources = new Map<string, StepSource>()

  for (const step of steps) {
    if (step.kind === "thought") {
      sources.set("thoughts", { kind: "thoughts" })
    } else if (step.kind === "tool") {
      const { server } = parseToolName(step.tool.name)

      if (server) {
        sources.set(`server:${server}`, { kind: "server", name: server })
      } else {
        sources.set("tools", { kind: "tools" })
      }
    }
  }

  return [...sources.values()]
    .sort((a, b) => sourceOrder.indexOf(a.kind) - sourceOrder.indexOf(b.kind))
    .slice(0, max)
}

/**
 * Short detail of a tool row in the timeline: `7 results · 0.8s` once done,
 * otherwise the same text as the details card.
 */
export function describeToolStep(
  tool: MessageAssistantTool,
  now = Date.now(),
  isRunActive = true,
) {
  if (getToolCallState(tool, isRunActive) !== "completed") {
    return describeToolCall(tool, now, isRunActive)
  }

  const count = countToolResults(tool.result)
  const parts = [
    count !== undefined ? plural(count, "result") : null,
    tool.durationMs !== undefined ? formatDuration(tool.durationMs) : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Done"
}
