import type { ApiClient } from "@pilot43/protocol"

declare global {
  var __apiClient: ApiClient | undefined
}

export {}
