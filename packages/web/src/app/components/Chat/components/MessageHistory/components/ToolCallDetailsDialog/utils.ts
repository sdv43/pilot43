import type { MessageAssistantTool } from "@pilot43/protocol"

import type { BadgeTone } from "../../../../../Badge"

import {
  countToolResults,
  formatDuration,
  getToolCallState,
  type ToolCallState,
} from "../../../../../../../shared/tool-call"

export const stateBadges: Record<
  ToolCallState,
  { label: string; tone: BadgeTone }
> = {
  awaiting_approval: { label: "Waiting for approval", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  denied: { label: "Denied", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  running: { label: "Running", tone: "accent" },
}

/** `0.8s · 7 results · auto-approved`. */
export function describeToolRun(tool: MessageAssistantTool) {
  const count = countToolResults(tool.result)
  const approval =
    tool.approval === "allowed"
      ? "auto-approved"
      : tool.approval === "approved"
        ? "you allowed it"
        : undefined

  return [
    tool.durationMs !== undefined ? formatDuration(tool.durationMs) : null,
    count !== undefined
      ? `${count} ${count === 1 ? "result" : "results"}`
      : null,
    approval,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Output shown in the dialog: the error text for failed calls. */
export function getToolOutput(tool: MessageAssistantTool) {
  const state = getToolCallState(tool)
  const error = tool.result?.error

  if ((state === "failed" || state === "denied") && typeof error === "string") {
    return { isError: true, text: error }
  }

  return {
    isError: false,
    text: tool.result ? JSON.stringify(tool.result, null, 2) : "",
  }
}

const sizeFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

/** `4.1 KB · JSON`. */
export function describeOutputSize(text: string) {
  const bytes = new TextEncoder().encode(text).length

  return bytes < 1024
    ? `${bytes} B · JSON`
    : `${sizeFormatter.format(bytes / 1024)} KB · JSON`
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
})

export function formatTime(timestamp: number) {
  return timeFormatter.format(timestamp)
}
