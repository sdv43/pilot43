import { type KeyboardEvent, useCallback } from "react"

import { useSendMessage } from "../../../hooks/useSendMessage"

export function useMessageKeyDown() {
  const { isSendDisabled, sendMessage } = useSendMessage()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()
        if (!isSendDisabled) {
          void sendMessage()
        }
      }
    },
    [isSendDisabled, sendMessage],
  )

  return { handleKeyDown }
}
