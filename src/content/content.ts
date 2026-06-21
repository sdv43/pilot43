import { Readability } from "@mozilla/readability"

import type { SidepanelNotification } from "@/offscreen/types"

import { addMessageListener } from "@/shared/chrome"

import {
  type ActionPageContentGetById,
  type ActionPageContentSelectionGet,
} from "./types"

console.debug("content script loaded")

let lastSelectionText = window.getSelection()?.toString().trim() ?? ""
let lastSelectionSnapshot: null | {
  content: string
  description: string
  title: string
  uniqueKey: string
  url: string
} = null

function updateLastSelectionSnapshot(selectionText: string) {
  if (!selectionText) {
    return
  }

  const description =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") ?? ""

  lastSelectionSnapshot = {
    content: selectionText,
    description,
    title: document.title,
    uniqueKey: `${window.location.href}:${Date.now()}`,
    url: window.location.href,
  }
}

document.addEventListener("selectionchange", () => {
  const selectionText = window.getSelection()?.toString().trim() ?? ""

  if (selectionText === lastSelectionText) {
    return
  }

  if (selectionText) {
    updateLastSelectionSnapshot(selectionText)
  } else if (document.hasFocus()) {
    lastSelectionSnapshot = null
  }

  lastSelectionText = selectionText

  const notification: SidepanelNotification = {
    target: "sidepanel",
    action: "pageContextUpdated",
    payload: { reason: "selectionChanged" },
  }

  chrome.runtime.sendMessage(notification).catch((error) => {
    if (`${error}`.includes("Receiving end does not exist")) {
      return
    }

    console.error("Error sending sidepanel selection notification:", error)
  })
})

addMessageListener<
  ActionPageContentGetById["message"],
  ActionPageContentGetById["response"]
>("content", "pageContentGetById", ({ payload }) => {
  const documentClone = document.cloneNode(true) as Document
  const article = new Readability(documentClone).parse()

  if (!article) {
    throw new Error("Readability could not parse page content")
  }

  return { result: { ...article, url: window.location.href, id: payload[0] } }
})

addMessageListener<
  ActionPageContentSelectionGet["message"],
  ActionPageContentSelectionGet["response"]
>("content", "pageContentSelectionGet", (_message, sender) => {
  const selectionText = window.getSelection()?.toString().trim() ?? ""

  if (selectionText) {
    updateLastSelectionSnapshot(selectionText)
    lastSelectionText = selectionText
  }

  if (!selectionText && document.hasFocus()) {
    lastSelectionSnapshot = null
  }

  if (!lastSelectionSnapshot) {
    return { result: null }
  }

  return {
    result: {
      id: sender.tab?.id ?? -1,
      uniqueKey: lastSelectionSnapshot.uniqueKey,
      url: lastSelectionSnapshot.url,
      title: lastSelectionSnapshot.title,
      description: lastSelectionSnapshot.description,
      content: lastSelectionSnapshot.content,
    },
  }
})
