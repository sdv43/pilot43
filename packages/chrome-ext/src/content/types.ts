import type { PageContentSelection, PageContextApi } from "@pilot43/protocol"

import type { MessageFormats, MessageResponseFormat } from "../shared/chrome"

export type ActionPageContentGetById = MessageFormats<
  "pageContentGetById",
  "content"
>

/**
 * A content script does not know the id of its tab, so the selection comes
 * without it and the side panel adds the id of the tab it asked.
 */
export type ActionPageContentSelectionGet = {
  message: MessageFormats<"pageContentSelectionGet", "content">["message"]
  response: MessageResponseFormat<null | Omit<PageContentSelection, "id">>
}

export type ContentApiClient = PageContextApi
