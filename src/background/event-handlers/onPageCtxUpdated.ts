import type { SidepanelNotification } from "@/offscreen"

export function onPageCtxUpdated(
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
    if (`${error}`.includes("Receiving end does not exist")) {
      return
    }

    console.error("Error sending sidepanel page context notification:", error)
  })
}
