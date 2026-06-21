import type { MessageRun } from "@/shared/api"

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
    run.updatedAt >= latestRun.updatedAt ? run : latestRun,
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
