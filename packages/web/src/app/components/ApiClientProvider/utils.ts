import type { ApiNotification, MessageRun } from "@pilot43/protocol"

type StreamedMessage = Extract<
  ApiNotification,
  { action: "messageRunStreamed" }
>["payload"]["message"]

/**
 * The runs with the streamed text applied to its assistant message, or
 * `undefined` when the message is not among them yet (the runs must be
 * fetched again).
 */
export function applyStreamedMessage(
  runs: MessageRun[] | undefined,
  messageRunId: MessageRun["id"],
  message: StreamedMessage,
): MessageRun[] | undefined {
  const run = runs?.find(({ id }) => id === messageRunId)
  const target = run?.assistantMessages.find(({ id }) => id === message.id)

  if (!runs || !run || target?.role !== "assistant") {
    return undefined
  }

  // A refetch may already hold more of the text than this notification.
  if (
    target.content.length > message.content.length ||
    (target.thoughts?.length ?? 0) > (message.thoughts?.length ?? 0)
  ) {
    return runs
  }

  return runs.map((candidate) =>
    candidate === run
      ? {
          ...run,
          assistantMessages: run.assistantMessages.map((entry) =>
            entry === target ? { ...target, ...message } : entry,
          ),
        }
      : candidate,
  )
}
