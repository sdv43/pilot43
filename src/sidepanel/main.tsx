import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"

import "./index.css"
import { createRoot } from "react-dom/client"

import { App } from "./app"
import { ApiClientProvider } from "./app/components/ApiClientProvider"
import { ErrorBoundary } from "./app/components/ErrorBoundary"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Root element not found")
}

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
        <ApiClientProvider>
          <App />
        </ApiClientProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
