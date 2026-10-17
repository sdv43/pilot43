import type { McpServer, ModelTool } from "@pilot43/protocol"

import { useMutation } from "@tanstack/react-query"
import { useState } from "react"

import { useApiClient } from "../../../../components/ApiClientProvider/context"

type TestResult =
  { message: string; success: false } | { success: true; tools: ModelTool[] }

/** Connects to the server being edited and lists its tools. */
export function useMcpServerTest() {
  const apiClient = useApiClient()
  const [result, setResult] = useState<null | TestResult>(null)
  const { isPending, mutate } = useMutation({
    mutationFn: (server: McpServer) => apiClient.mcpServerToolsGet(server),
  })

  function test(server: McpServer) {
    mutate(server, {
      onError: (error) => setResult({ message: error.message, success: false }),
      onSuccess: (tools) =>
        setResult({
          success: true,
          tools: tools.filter((tool) => !tool.hidden),
        }),
    })
  }

  return { isTesting: isPending, reset: () => setResult(null), result, test }
}
