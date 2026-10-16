import type { PageContextApi } from "@pilot43/protocol"

import type { MessageFormats } from "@/shared/chrome"

export type ActionPageContentGetById = MessageFormats<
  "pageContentGetById",
  "content"
>

export type ActionPageContentSelectionGet = MessageFormats<
  "pageContentSelectionGet",
  "content"
>

export type ContentApiClient = PageContextApi
