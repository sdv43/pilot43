import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import type { ApiClientProviderProps } from "./types"

import { useThrottling } from "../../../shared/useThrottling"
import { ApiClientContext } from "./context"

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

      if (notification.action === "pageContextUpdated") {
        throttledInvalidatePageContext()
      }
    })
  }, [client, queryClient, throttledInvalidate, throttledInvalidatePageContext])

  return <ApiClientContext value={client}>{children}</ApiClientContext>
}
