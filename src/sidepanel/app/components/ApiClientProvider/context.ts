import { createContext, use } from "react"

import type { ApiClient } from "@/shared/api"

export const ApiClientContext = createContext<ApiClient | null>(null)

export function useApiClient() {
  const apiClient = use(ApiClientContext)

  if (!apiClient) {
    throw new Error("useApiClient must be used within an ApiClientProvider")
  }

  return apiClient
}
