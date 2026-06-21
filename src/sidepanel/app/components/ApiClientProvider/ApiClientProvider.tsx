import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"

import type { SidepanelNotification } from "@/offscreen/types"

import { contentApiClient } from "@/content"
import { offscreenApiClient } from "@/offscreen"
import { useThrottling } from "@/sidepanel/shared/useThrottling"

import type { ApiClientProviderProps } from "./types"

import { ApiClientContext } from "./context"

function resolveApiClient() {
  if (globalThis.__apiClient) {
    return globalThis.__apiClient
  }

  return {
    ...offscreenApiClient,
    ...contentApiClient,
  }
}

export function ApiClientProvider({ children }: ApiClientProviderProps) {
  const apiClient = useMemo(() => resolveApiClient(), [])
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
    const handleMessage = (message: unknown) => {
      const notification = message as SidepanelNotification

      if (notification.target !== "sidepanel") {
        return
      }

      if (notification.action === "messageRunUpdated") {
        void queryClient.invalidateQueries({
          queryKey: ["chatMessageRunGet", notification.payload.chatId],
        })

        throttledInvalidate()
      }

      if (notification.action === "pageContextUpdated") {
        throttledInvalidatePageContext()
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [queryClient, throttledInvalidate, throttledInvalidatePageContext])

  useEffect(() => {
    // Signal to the service worker that the sidepanel is open so it can
    // ensure the offscreen document (backend) is running.
    const port = chrome.runtime.connect({ name: "sidepanel" })
    return () => {
      port.disconnect()
    }
  }, [])

  return <ApiClientContext value={apiClient}>{children}</ApiClientContext>
}
