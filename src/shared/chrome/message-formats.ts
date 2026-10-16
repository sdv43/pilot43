import type { BackendApi, PageContextApi } from "@pilot43/protocol"

import type { MessageFormat, MessageResponseFormat } from "./types"

/** Operations served over Chrome runtime messaging. */
type MessagingApi = BackendApi & PageContextApi

export type MessageFormats<M extends keyof MessagingApi, T extends string> = {
  message: MessageFormat<T, M, Parameters<MessagingApi[M]>>
  response: MessageResponseFormat<Awaited<ReturnType<MessagingApi[M]>>, string>
}
