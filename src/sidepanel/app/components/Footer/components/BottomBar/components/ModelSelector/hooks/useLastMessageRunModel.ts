import { useEffect } from "react"

import type { MessageRun } from "@/shared/api"

import { getModelProviderModelId } from "@/shared/model-provider-utils"
import { footerActions } from "@/sidepanel/app/components"
import { getLastMessageRun } from "@/sidepanel/app/components/Footer/utils"

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
