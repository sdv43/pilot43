import type { ModelProviderCheckResult } from "@pilot43/protocol"

import { useState } from "react"

import {
  type ModelProvider,
  useModelProviderCheck,
} from "../../../../../queries/modelProvider"

/** Tests the connection of the provider being edited. */
export function useProviderTest() {
  const { isPending, mutate } = useModelProviderCheck()
  const [result, setResult] = useState<ModelProviderCheckResult | null>(null)

  function test(provider: ModelProvider) {
    mutate(provider, {
      onError: (error) => setResult({ message: error.message, success: false }),
      onSuccess: setResult,
    })
  }

  return { isTesting: isPending, reset: () => setResult(null), result, test }
}
