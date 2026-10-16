import type { MessageRun } from "@pilot43/protocol"

import { getModelProviderModelId } from "@pilot43/protocol"
import { useEffect } from "react"

import { footerActions } from "../../../../../.."
import { getLastMessageRun } from "../../../../../utils"

export function useLastMessageRunModel(
  messageRuns: MessageRun[] | undefined,
  selectedChatId: null | string | undefined,
): void {
  useEffect(() => {
    const lastMessageRun = getLastMessageRun(messageRuns)

    if (!lastMessageRun) {
      return
    }

    footerActions.setSelectedModelId(
      getModelProviderModelId(
        lastMessageRun.modelMeta.provider,
        lastMessageRun.modelMeta.name,
      ),
    )
  }, [messageRuns, selectedChatId])
}
