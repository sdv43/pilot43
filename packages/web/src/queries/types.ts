import type { useApiClient } from "../app/components/ApiClientProvider/context"

export type Result<T extends keyof ApiClient> = Awaited<
  ReturnType<NonNullable<ApiClient[T]>>
>
export type Args<T extends keyof ApiClient> = Parameters<
  NonNullable<ApiClient[T]>
>[0]
export type ApiClient = ReturnType<typeof useApiClient>
