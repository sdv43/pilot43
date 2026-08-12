import type { SidepanelNotification } from "@/sidepanel/notificatoin"

export function handlePageCtxUpdate(
  reason: Extract<
    SidepanelNotification,
    { action: "pageContextUpdated" }
  >["payload"]["reason"],
) {
  const notification: SidepanelNotification = {
    target: "sidepanel",
    action: "pageContextUpdated",
    payload: { reason },
  }

  chrome.runtime.sendMessage(notification).catch((error) => {
    console.error("Error sending sidepanel page context notification:", error)
  })
}
