import { onInstalled } from "./event-handlers/onInstalled"
import { onPageCtxUpdated } from "./event-handlers/onPageCtxUpdated"

console.log("service worker loaded")

chrome.runtime.onInstalled.addListener(onInstalled)

async function createOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  })

  if (existingContexts.length > 0) return

  await chrome.offscreen.createDocument({
    justification: "Backend for chat operations with IndexedDB and AI models",
    reasons: ["DOM_PARSER"],
    url: chrome.runtime.getURL("offscreen.html"),
  })
}

// Create offscreen document on service worker startup
createOffscreenDocument().catch((error: unknown) => {
  console.error("Error creating offscreen document on startup:", error)
})

// Recreate offscreen document whenever the sidepanel is opened
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    createOffscreenDocument().catch((error: unknown) => {
      console.error(
        "Error creating offscreen document on sidepanel open:",
        error,
      )
    })
  }
})

chrome.tabs.onActivated.addListener(() => {
  onPageCtxUpdated("tabActivated")
})

chrome.tabs.onCreated.addListener(() => {
  onPageCtxUpdated("tabCreated")
})

chrome.tabs.onRemoved.addListener(() => {
  onPageCtxUpdated("tabRemoved")
})

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (
    changeInfo.status === "complete" ||
    changeInfo.title !== undefined ||
    changeInfo.url !== undefined
  ) {
    onPageCtxUpdated("tabUpdated")
  }
})
