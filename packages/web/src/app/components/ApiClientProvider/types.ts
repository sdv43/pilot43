import type { ApiClient } from "@pilot43/protocol"
import type { ReactNode } from "react"

export interface ApiClientProviderProps {
  children: ReactNode
  client: ApiClient
}
