import {
  useChatMessageRunGet,
  useChatMessageRunStop,
} from "@/sidepanel/queries/chat"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { toast } from "../../ToastProvider"
import { getActiveMessageRun } from "../utils"

export function useStopMessageRun() {
  const workspace = useCurrentWorkspace()
  const selectedChatId = workspace?.lastSelectedChatId

  const { data: messageRuns } = useChatMessageRunGet(selectedChatId)
  const { isPending, mutate: stopMessageRunMutation } = useChatMessageRunStop()

  const activeMessageRun = getActiveMessageRun(messageRuns)

  const stopMessageRun = () => {
    if (!activeMessageRun) {
      return
    }

    stopMessageRunMutation(activeMessageRun.id, {
      onError: (error) => {
        toast(`Error stopping message: ${error.message}`, "error")
      },
    })
  }

  return {
    isStopPending: isPending,
    shouldShowStopButton: Boolean(activeMessageRun),
    stopMessageRun,
  }
}
