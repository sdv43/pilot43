import type { MessageRun } from "@pilot43/protocol"

export function isCommandAttachable(command: string) {
  return (
    isFileCommand(command) ||
    isPageCommand(command) ||
    isSelectionCommand(command)
  )
}

export function isFileCommand(command: string) {
  return command.startsWith("file:")
}

export function isPageCommand(command: string) {
  return command.startsWith("page:")
}

export function isSelectionCommand(command: string) {
  return command.startsWith("selection:")
}

export function createPageCommand(cmd: string) {
  return `page:${cmd}`
}

export function createFileCommand(cmd: string) {
  return `file:${cmd}`
}

export function createSelectionCommand(cmd: string) {
  return `selection:${cmd}`
}

export function getLastMessageRun(messageRuns?: MessageRun[]) {
  if (!messageRuns || messageRuns.length === 0) {
    return null
  }

  return messageRuns.reduce((latestRun, run) =>
    run.createdAt >= latestRun.createdAt ? run : latestRun,
  )
}

/**
 * Returns the latest message run if it is still actively generating a
 * response (i.e. in the `pending` or `running` state), otherwise `null`.
 */
export function getActiveMessageRun(messageRuns?: MessageRun[]) {
  const lastMessageRun = getLastMessageRun(messageRuns)
  if (!lastMessageRun) {
    return null
  }

  return lastMessageRun.status === "pending" ||
    lastMessageRun.status === "running"
    ? lastMessageRun
    : null
}

/**
 * Commands run by sending `/<command>` on its own. They head the "/" menu,
 * before the prompts.
 */
export const chatCommands = [
  {
    command: "compact",
    description:
      "Summarise earlier messages so the chat fits the model’s context window.",
  },
] as const

export type ChatCommand = (typeof chatCommands)[number]["command"]

/** The command a message runs, when it is just `/<command>`. */
export function getChatCommand(text: string): ChatCommand | undefined {
  const trimmed = text.trim()

  return chatCommands.find(({ command }) => trimmed === `/${command}`)?.command
}
