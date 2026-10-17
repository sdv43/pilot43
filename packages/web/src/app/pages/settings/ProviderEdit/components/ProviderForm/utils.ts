import type { ModelProviderCheckResult } from "@pilot43/protocol"

/** `Connected · 42 models · 312 ms` or the error message. */
export function formatTestMessage(result: ModelProviderCheckResult) {
  if (!result.success) {
    return result.message
  }

  return [
    "Connected",
    result.models ? `${result.models.length} models` : null,
    result.latencyMs !== undefined ? `${result.latencyMs} ms` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}
