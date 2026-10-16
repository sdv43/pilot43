import { mountApp } from "@pilot43/web"

import { createChromeApiClient } from "./chrome-api-client"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Root element not found")
}

// Signal to the service worker that the side panel is open so it can ensure
// the offscreen document (backend) is running.
chrome.runtime.connect({ name: "sidepanel" })

mountApp(root, {
  // End-to-end tests replace the backend with a mocked client.
  client: globalThis.__apiClient ?? createChromeApiClient(),
})
