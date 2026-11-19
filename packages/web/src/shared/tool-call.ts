import type { MessageAssistantTool, MessageRun } from "@pilot43/protocol"

const mcpToolPattern = /^mcp__(.+?)__(.+)$/

/** Server and tool name of a call (`github` / `search_issues`). */
export function parseToolName(name: string): { server?: string; tool: string } {
  const match = name.match(mcpToolPattern)

  return match ? { server: match[1], tool: match[2] } : { tool: name }
}

/** `github · search_issues` for MCP tools, the name for built-in tools. */
export function formatToolName(name: string) {
  const { server, tool } = parseToolName(name)

  return server ? `${server} · ${tool}` : tool
}

export type ToolCallState =
  | "awaiting_approval"
  | "completed"
  | "denied"
  | "failed"
  | "running"
  /** Was running when the user stopped the run; it never finished. */
  | "stopped"

/**
 * State of a call. Calls saved before calls had a status are inferred from
 * their result. A call still "running" in a run that is no longer active was
 * cut off by Stop.
 */
export function getToolCallState(
  tool: MessageAssistantTool,
  isRunActive = true,
): ToolCallState {
  const state =
    tool.status ??
    (!tool.result
      ? "running"
      : tool.result.ok === false
        ? "failed"
        : "completed")

  return state === "running" && !isRunActive ? "stopped" : state
}

export function getToolCallError(tool: MessageAssistantTool) {
  const error = tool.result?.error

  return typeof error === "string" ? error : undefined
}

/** `0.8s`, `1.2s`, `14s`, `2m 5s`. */
export function formatDuration(ms: number) {
  if (ms < 10_000) {
    return `${(ms / 1000).toFixed(1)}s`
  }

  const seconds = Math.round(ms / 1000)

  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/** Number of items when the result is (or wraps) a list. */
export function countToolResults(result: MessageAssistantTool["result"]) {
  if (!result) {
    return undefined
  }

  for (const key of ["items", "results", "resources", "issues", "data"]) {
    const value = result[key]

    if (Array.isArray(value)) {
      return value.length
    }
  }

  return undefined
}

/** Secondary line of a tool call row. */
export function describeToolCall(
  tool: MessageAssistantTool,
  now = Date.now(),
  isRunActive = true,
) {
  const state = getToolCallState(tool, isRunActive)

  switch (state) {
    case "awaiting_approval":
      return "Set to “Ask” in this workspace"
    case "denied":
      return "Denied · not run"
    case "stopped":
      return "Stopped by you"
    case "failed":
      return tool.durationMs !== undefined
        ? `Failed · ${formatDuration(tool.durationMs)}`
        : "Failed"
    case "running":
      return tool.startedAt
        ? `Running · ${formatDuration(now - tool.startedAt)}`
        : "Running"
    case "completed": {
      const count = countToolResults(tool.result)

      return [
        "Completed",
        tool.durationMs !== undefined ? formatDuration(tool.durationMs) : null,
        count !== undefined
          ? `${count} ${count === 1 ? "result" : "results"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    }
  }
}

/** Generation time of a finished run, if known. */
export function getRunDuration(run: MessageRun) {
  if (run.completedAt === undefined) {
    return undefined
  }

  return run.completedAt - (run.startedAt ?? run.createdAt)
}

/** Pretty-printed JSON of tool arguments or results. */
export function stringifyToolPayload(value: unknown) {
  return JSON.stringify(value ?? null, null, 2) ?? "null"
}
