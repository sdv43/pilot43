import type { Page } from "@playwright/test"
import type { ApiNotification } from "@pilot43/protocol"

/**
 * Sends a backend notification to the side panel. A page does not receive its
 * own runtime messages, so it is sent from the service worker.
 */
export async function notifySidepanel(p: Page, notification: ApiNotification) {
  const [serviceWorker] = p.context().serviceWorkers()

  await serviceWorker.evaluate(async (message) => {
    await chrome.runtime.sendMessage({ target: "sidepanel", ...message })
  }, notification)
}
