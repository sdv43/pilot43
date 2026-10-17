import { useChatMessageRunGet } from "../../../../queries/chat"
import { useCurrentChatId } from "../../../../shared/useCurrentWorkspace"
import { getLastMessageRun } from "../utils"

export type ComposerMode =
  /** Waiting for the user's answer to the assistant's questions. */
  | "answer"
  /** A response is being generated. */
  | "generating"
  | "idle"
  /** Paused on a tool approval or continuation notice. */
  | "paused"

/** What the composer does right now, from the chat's latest run. */
export function useComposerMode() {
  const chatId = useCurrentChatId()
  const { data: messageRuns } = useChatMessageRunGet(chatId)
  const run = getLastMessageRun(messageRuns)

  let mode: ComposerMode = "idle"

  if (run?.status === "pending" || run?.status === "running") {
    mode = "generating"
  } else if (run?.status === "awaiting_input") {
    mode = run.followupQuestion ? "answer" : "paused"
  }

  return { mode, run }
}
