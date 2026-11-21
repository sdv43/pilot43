import type { Chat, MessageRun } from "@pilot43/protocol"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import type { ApiClientProviderProps } from "./types"

import { useThrottling } from "../../../shared/useThrottling"
import { ApiClientContext } from "./context"
import { applyStreamedMessage } from "./utils"

export function ApiClientProvider({
  children,
  client,
}: ApiClientProviderProps) {
  const queryClient = useQueryClient()

  const throttledInvalidate = useThrottling(() => {
    void queryClient.invalidateQueries({
      queryKey: ["chatGetByWorkspace"],
    })
    void queryClient.invalidateQueries({
      queryKey: ["chatTokenEstimateGet"],
    })
  }, 500)

  const throttledInvalidateRuns = useThrottling((chatId: Chat["id"]) => {
    void queryClient.invalidateQueries({
      queryKey: ["chatMessageRunGet", chatId],
    })
  }, 500)

  const throttledInvalidatePageContext = useThrottling(() => {
    void queryClient.invalidateQueries({
      queryKey: ["pageContentGet"],
    })
    void queryClient.invalidateQueries({
      queryKey: ["pageContentGetById"],
    })
    void queryClient.invalidateQueries({
      queryKey: ["pageContentSelectionGet"],
    })
  }, 150)

  useEffect(() => {
    return client.subscribe((notification) => {
      if (notification.action === "messageRunUpdated") {
        void queryClient.invalidateQueries({
          queryKey: ["chatMessageRunGet", notification.payload.chatId],
        })

        throttledInvalidate()
      }

      if (notification.action === "messageRunStreamed") {
        const { chatId, message, messageRunId } = notification.payload
        const queryKey = ["chatMessageRunGet", chatId]
        const cachedRuns = queryClient.getQueryData<MessageRun[]>(queryKey)

        // Chats that were never opened have nothing to patch.
        if (cachedRuns) {
          const runs = applyStreamedMessage(cachedRuns, messageRunId, message)

          if (runs) {
            queryClient.setQueryData(queryKey, runs)
          } else {
            // The message is not loaded yet (e.g. a fetch was in flight).
            throttledInvalidateRuns(chatId)
          }
        }
      }

      if (notification.action === "chatsChanged") {
        void queryClient.invalidateQueries({ queryKey: ["chatGetByWorkspace"] })
        void queryClient.invalidateQueries({ queryKey: ["workspaceGet"] })
      }

      if (notification.action === "pageContextUpdated") {
        throttledInvalidatePageContext()
      }
    })
  }, [
    client,
    queryClient,
    throttledInvalidate,
    throttledInvalidatePageContext,
    throttledInvalidateRuns,
  ])

  return <ApiClientContext value={client}>{children}</ApiClientContext>
}
