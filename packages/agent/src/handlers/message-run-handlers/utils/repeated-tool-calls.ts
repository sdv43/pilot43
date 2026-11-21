import type { ChatToolCall } from "../../../models"

/**
 * Round trips in a row the same call (same tool, same arguments) may be made
 * before it is refused. A model stuck repeating a call gets a nudge instead
 * of using up the round-trip limit.
 */
export const maxRepeatedToolCallRounds = 2

/**
 * Tracks the calls of consecutive round trips of a run and refuses a call
 * made with the same arguments in the previous
 * {@link maxRepeatedToolCallRounds} round trips in a row.
 */
export function createRepeatedToolCallGuard() {
  /** Round trips in a row each call was made in, keyed by its signature. */
  let streaks = new Map<string, number>()

  return {
    /**
     * Records the calls of the next round trip and returns the error for each
     * call that must not run (see `ToolCallsExecution.rejectCall`).
     */
    nextRound(
      toolCalls: ChatToolCall[],
    ): (toolCall: ChatToolCall) => string | undefined {
      const nextStreaks = new Map<string, number>()

      for (const toolCall of toolCalls) {
        const signature = getToolCallSignature(toolCall)

        nextStreaks.set(signature, (streaks.get(signature) ?? 0) + 1)
      }

      streaks = nextStreaks

      return (toolCall) => {
        const rounds = streaks.get(getToolCallSignature(toolCall)) ?? 0

        return rounds > maxRepeatedToolCallRounds
          ? `This exact call (same tool and arguments) was already made in the previous ${maxRepeatedToolCallRounds} round trips in a row, so it was not run again. Use the earlier result, change the arguments, or take a different approach.`
          : undefined
      }
    },
  }
}

/** Tool name and arguments, with object keys sorted. */
export function getToolCallSignature(toolCall: ChatToolCall): string {
  let args: unknown

  try {
    args = JSON.parse(toolCall.arguments || "{}")
  } catch {
    args = toolCall.arguments
  }

  return `${toolCall.name}:${JSON.stringify(args, sortKeys)}`
}

function sortKeys(_key: string, value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  )
}
