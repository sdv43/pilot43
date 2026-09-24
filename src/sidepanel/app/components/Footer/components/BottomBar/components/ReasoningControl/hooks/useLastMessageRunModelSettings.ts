import { useEffect } from "react"

import type { MessageRun } from "@/shared/api"

import { footerActions } from "@/sidepanel/app/components"
import { getLastMessageRun } from "@/sidepanel/app/components/Footer/utils"

export function useLastMessageRunModelSettings(
  messageRuns: MessageRun[] | undefined,
  selectedChatId: null | string | undefined,
): void {
  useEffect(() => {
    const lastMessageRun = getLastMessageRun(messageRuns)

    if (!lastMessageRun) {
      return
    }

    footerActions.setSelectedReasoningEffort(
      lastMessageRun.modelMeta.settings.reasoningEffort ?? null,
    )
    footerActions.setThinkingEnabled(
      lastMessageRun.modelMeta.settings.thinking ?? true,
    )
  }, [messageRuns, selectedChatId])
}
