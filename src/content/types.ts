import type { MessageFormats } from "@/shared/api"
import type { ApiClient } from "@/sidepanel/queries/types"

export type ActionPageContentGetById = MessageFormats<
  "pageContentGetById",
  "content"
>

export type ActionPageContentSelectionGet = MessageFormats<
  "pageContentSelectionGet",
  "content"
>

export type ContentApiClient = Pick<
  ApiClient,
  "pageContentGet" | "pageContentGetById" | "pageContentSelectionGet"
>
