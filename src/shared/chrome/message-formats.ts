import type { ApiClient } from "@pilot43/protocol"

import type { MessageFormat, MessageResponseFormat } from "./types"

export type MessageFormats<M extends keyof ApiClient, T extends string> = {
  message: MessageFormat<T, M, Parameters<ApiClient[M]>>
  response: MessageResponseFormat<Awaited<ReturnType<ApiClient[M]>>, string>
}
