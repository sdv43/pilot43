import type { McpServer, ModelTool } from "@pilot43/protocol"

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useApiClient } from "../app/components/ApiClientProvider/context"

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

/**
 * Tools of several MCP servers at once (same cache as
 * {@link useMcpServerToolsGet}): each server's tools, and the servers whose
 * tools failed to load.
 */
export function useMcpServersToolsGet(servers: McpServer[]) {
  const apiClient = useApiClient()

  return useQueries({
    queries: servers.map((server) => ({
      queryKey: mcpServerToolsGetQueryKey(server.name),
      queryFn: async () => await apiClient.mcpServerToolsGet(server),
      retry: false,
      throwOnError: false,
    })),
    combine: (results) => ({
      failedServerNames: servers
        .filter((_server, index) => !!results[index]?.error)
        .map((server) => server.name),
      toolsByServer: Object.fromEntries(
        servers.map((server, index) => [
          server.name,
          results[index]?.data ?? ([] as ModelTool[]),
        ]),
      ),
    }),
  })
}
