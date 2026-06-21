import type { ApiClient } from "@/shared/api"

declare global {
  var __apiClient: ApiClient | undefined
}

export {}
