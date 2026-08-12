import type { Chat, MessageRun } from "@/shared/api"
import type { SidepanelNotification } from "@/sidepanel/notificatoin"

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
