import {
  useChatMessageRunGet,
  useChatMessageRunStop,
} from "../../../../queries/chat"
import { useCurrentChatId } from "../../../../shared/useCurrentWorkspace"
import { toast } from "../../ToastProvider"
import { getActiveMessageRun } from "../utils"

export function useStopMessageRun() {
  const currentChatId = useCurrentChatId()
  const selectedChatId = currentChatId

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
