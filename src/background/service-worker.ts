import { handleInstall } from "./handlers/handleInstall"
import { handlePageCtxUpdate } from "./handlers/handlePageCtxUpdate"

console.log("service worker loaded")

chrome.runtime.onInstalled.addListener(handleInstall)

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
  handlePageCtxUpdate("tabActivated")
})

chrome.tabs.onCreated.addListener(() => {
  handlePageCtxUpdate("tabCreated")
})

chrome.tabs.onRemoved.addListener(() => {
  handlePageCtxUpdate("tabRemoved")
})

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (
    changeInfo.status === "complete" ||
    changeInfo.title !== undefined ||
    changeInfo.url !== undefined
  ) {
    handlePageCtxUpdate("tabUpdated")
  }
})
