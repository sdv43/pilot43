import type { ApiClient } from "@pilot43/protocol"

import { createContext, use } from "react"

export const ApiClientContext = createContext<ApiClient | null>(null)

export function useApiClient() {
  const apiClient = use(ApiClientContext)

  if (!apiClient) {
    throw new Error("useApiClient must be used within an ApiClientProvider")
  }

  return apiClient
}
