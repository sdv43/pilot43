import type { MessageFormat, MessageResponseFormat } from "../chrome"
import type { ApiClient } from "./api-client"

export type MessageFormats<M extends keyof ApiClient, T extends string> = {
  message: MessageFormat<T, M, Parameters<ApiClient[M]>>
  response: MessageResponseFormat<Awaited<ReturnType<ApiClient[M]>>, string>
}
