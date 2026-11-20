import type { MessageAssistant, MessageRun } from "@pilot43/protocol"

import type { ActivityIndicatorProps } from "./components"

import { formatDuration, getRunDuration } from "../../../../../shared/tool-call"
import { buildRunBlocks } from "./components/RunContent/utils"

export function isRunActive(run: MessageRun) {
  return (
    run.status === "pending" ||
    run.status === "running" ||
    run.status === "awaiting_input"
  )
}

function getAssistantMessages(run: MessageRun) {
  return run.assistantMessages.filter(
    (message): message is MessageAssistant => message.role === "assistant",
  )
}

/** Indicator under an active run: thinking, calling a tool or waiting. */
export function getRunActivity(
  run: MessageRun,
): ActivityIndicatorProps | undefined {
  if (run.status === "pending") {
    return { label: "Thinking…" }
  }

  if (run.status === "awaiting_input") {
    if (run.toolApproval) {
      return { label: "Paused — waiting for approval" }
    }

    return run.followupQuestion
      ? { label: "Waiting for your answer" }
      : undefined
  }

  if (run.status !== "running") {
    return undefined
  }

  // Once the model produced anything, the steps timeline (spinners, a
  // "Working…" row) or the streaming answer shows progress.
  const hasOutput = getAssistantMessages(run).some(
    (message) => message.content || message.thoughts || message.tools.length,
  )

  return hasOutput ? undefined : { label: "Thinking…" }
}

/** Text copied by the Copy button of a reply: the answers, not the steps. */
export function getRunCopyText(run: MessageRun) {
  return buildRunBlocks(run)
    .flatMap((block) =>
      block.kind === "answer" ? [block.message.content] : [],
    )
    .join("\n\n")
}

/** `2,410 tokens · 5.2s`. */
export function getRunMeta(run: MessageRun) {
  const messages = getAssistantMessages(run)
  const hasTokens = messages.some((message) => message.tokenCount !== undefined)
  const tokens = messages.reduce(
    (total, message) => total + (message.tokenCount ?? 0),
    0,
  )
  const duration = getRunDuration(run)

  return [
    hasTokens ? `${tokens.toLocaleString("en-US")} tokens` : null,
    duration !== undefined ? formatDuration(duration) : null,
  ]
    .filter(Boolean)
    .join(" · ")
}
