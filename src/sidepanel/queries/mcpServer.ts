import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { McpServer, ModelTool } from "@/shared/api"

import { useApiClient } from "@/sidepanel/app/components/ApiClientProvider/context"

export const mcpServerGetQueryKey = ["mcpServerGet"] as const

/**
 * Query key for a single MCP server's tools. Parameterized by server name so
 * each server's tool list is cached independently.
 */
export const mcpServerToolsGetQueryKey = (serverName: string) =>
  ["mcpServerToolsGet", serverName] as const

export function useMcpServerGet() {
  const apiClient = useApiClient()
  return useQuery({
    queryKey: mcpServerGetQueryKey,
    queryFn: async () => {
      return await apiClient.mcpServerGet()
    },
  })
}

export function useMcpServerUpdate() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (servers: McpServer[]) => {
      return await apiClient.mcpServerUpdate(servers)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mcpServerGetQueryKey })
    },
  })
}

/**
 * Fetches the tools exposed by a single MCP server. Tools are loaded eagerly
 * so the UI can surface server status and allow enabling an MCP group before
 * the first chat message creates a persisted chat.
 */
export function useMcpServerToolsGet(server: McpServer | undefined) {
  const apiClient = useApiClient()
  return useQuery({
    queryKey: server
      ? mcpServerToolsGetQueryKey(server.name)
      : ["mcpServerToolsGet", "__missing__"],
    queryFn: async () => {
      if (!server) {
        return [] as ModelTool[]
      }
      return await apiClient.mcpServerToolsGet(server)
    },
    enabled: Boolean(server),
    retry: false,
    throwOnError: false,
  })
}
