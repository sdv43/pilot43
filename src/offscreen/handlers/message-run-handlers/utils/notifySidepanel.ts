import type { Chat, MessageRun } from "@pilot43/protocol"

import type { SidepanelNotification } from "@/shared/chrome"

export function notifySidepanel(
  chatId: Chat["id"],
  messageRunId: MessageRun["id"],
) {
  const notification: SidepanelNotification = {
    target: "sidepanel",
    action: "messageRunUpdated",
    payload: { chatId, messageRunId },
  }

  chrome.runtime.sendMessage(notification).catch((error) => {
    console.error("Error sending notification:", error)
  })
}
