import type { PageContent } from "@/shared/api"
import type { ApiClient } from "@/shared/api/api-client"

import { sendMessage } from "@/shared/chrome"

import type {
  ActionPageContentGetById,
  ActionPageContentSelectionGet,
} from "./types"

export const contentApiClient: Pick<
  ApiClient,
  "pageContentGet" | "pageContentGetById" | "pageContentSelectionGet"
> = {
  async pageContentGet() {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })
    const tabs = await chrome.tabs.query({})

    return tabs
      .filter(
        (tab): tab is typeof tab & { id: number; url: string } =>
          tab.id !== undefined &&
          typeof tab.url === "string" &&
          tab.url.startsWith("http"),
      )
      .sort((left, right) => {
        if (left.id === activeTab?.id && right.id !== activeTab?.id) {
          return -1
        }

        if (right.id === activeTab?.id && left.id !== activeTab?.id) {
          return 1
        }

        if (left.windowId !== right.windowId) {
          return left.windowId - right.windowId
        }

        return left.index - right.index
      })
      .map((tab) => ({
        id: tab.id,
        title: tab.title ?? "",
        url: tab.url,
      }))
  },

  async pageContentGetById(id: PageContent["id"]) {
    try {
      return await sendMessage<
        ActionPageContentGetById["message"],
        ActionPageContentGetById["response"]
      >({ target: "content", action: "pageContentGetById", payload: [id] }, id)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          "Could not establish connection. Receiving end does not exist.",
        )
      ) {
        console.error(error)
        return null
      }

      throw error
    }
  },

  async pageContentSelectionGet() {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })

    if (!tab?.id) return null

    try {
      const result = await sendMessage<
        ActionPageContentSelectionGet["message"],
        ActionPageContentSelectionGet["response"]
      >(
        {
          target: "content",
          action: "pageContentSelectionGet",
          payload: [],
        },
        tab.id,
      )

      if (!result) return null

      return result
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          "Could not establish connection. Receiving end does not exist.",
        )
      ) {
        console.error(error)
        return null
      }

      throw error
    }
  },
}
