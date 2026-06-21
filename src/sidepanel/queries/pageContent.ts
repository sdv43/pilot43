import { useQuery } from "@tanstack/react-query"

import { useApiClient } from "../app/components/ApiClientProvider/context"

export function usePageContentGet() {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["pageContentGet"],
    queryFn: async () => {
      return await apiClient.pageContentGet()
    },
  })
}

export function usePageContentSelectionGet(options?: {
  enabled?: boolean
  throwOnError?: boolean
}) {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["pageContentSelectionGet"],
    queryFn: async () => {
      return await apiClient.pageContentSelectionGet()
    },
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options?.throwOnError !== undefined
      ? { throwOnError: options.throwOnError }
      : {}),
  })
}

export function usePageContentGetById(
  id: number,
  options?: { enabled?: boolean; snapshotKey?: string; throwOnError?: boolean },
) {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["pageContentGetById", id, options?.snapshotKey],
    queryFn: async () => {
      return await apiClient.pageContentGetById(id)
    },
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options?.throwOnError !== undefined
      ? { throwOnError: options.throwOnError }
      : {}),
  })
}
