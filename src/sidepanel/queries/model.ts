import { useQuery } from "@tanstack/react-query"

import { useApiClient } from "../app/components/ApiClientProvider/context"

export function useModelToolGet() {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["modelToolGet"],
    queryFn: async () => {
      return await apiClient.modelToolGet()
    },
  })
}
