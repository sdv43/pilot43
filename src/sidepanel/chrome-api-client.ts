import type { ApiClient } from "@pilot43/protocol"

import type { SidepanelNotification } from "@/shared/chrome"

import { contentApiClient } from "@/content"
import { offscreenApiClient } from "@/offscreen"

/**
 * {@link ApiClient} for the side panel: the backend runs in the offscreen
 * document, page context comes from the content scripts, and notifications
 * arrive as Chrome runtime messages addressed to the side panel.
 */
export function createChromeApiClient(): ApiClient {
  return {
    ...offscreenApiClient,
    ...contentApiClient,
    subscribe(listener) {
      const handleMessage = (message: unknown) => {
        const notification = message as SidepanelNotification

        if (notification.target === "sidepanel") {
          listener(notification)
        }
      }

      chrome.runtime.onMessage.addListener(handleMessage)

      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage)
      }
    },
  }
}
