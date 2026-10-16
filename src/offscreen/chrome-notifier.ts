import type { AgentNotifier } from "@pilot43/agent"

import type { SidepanelNotification } from "@/shared/chrome"

/**
 * Delivers agent notifications to the side panel over Chrome runtime
 * messaging.
 */
export const chromeNotifier: AgentNotifier = {
  notify(notification) {
    const message: SidepanelNotification = {
      ...notification,
      target: "sidepanel",
    }

    chrome.runtime.sendMessage(message).catch((error: unknown) => {
      console.error("Error sending notification:", error)
    })
  },
}
