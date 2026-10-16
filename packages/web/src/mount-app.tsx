import type { ApiClient } from "@pilot43/protocol"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { App } from "./app"
import { ApiClientProvider } from "./app/components/ApiClientProvider"
import { ErrorBoundary } from "./app/components/ErrorBoundary"

/**
 * Renders the Pilot43 UI into `root`, talking to the backend through
 * `client`.
 */
export function mountApp(root: HTMLElement, { client }: { client: ApiClient }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        throwOnError: true,
      },
    },
  })

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={client}>
            <App />
          </ApiClientProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}
