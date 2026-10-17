import type { ModelProviderCheckResult } from "@pilot43/protocol"

import type { ModelProvider } from "../../../../queries/modelProvider"

import { formatCount } from "../utils"

/** Last characters of a key, prefixed with dots (`•••• 91c0`). */
export function maskApiKey(apiKey: string) {
  return apiKey ? `•••• ${apiKey.slice(-4)}` : "No key"
}

function stripProtocol(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

/** Secondary line of a provider row: key or host, plus model count. */
export function getProviderDetail(
  provider: ModelProvider,
  status: ModelProviderCheckResult | undefined,
) {
  const parts =
    provider.type === "ollama"
      ? [stripProtocol(provider.settings.host)]
      : [
          maskApiKey(provider.settings.apiKey),
          provider.type === "openai" && provider.settings.host
            ? stripProtocol(provider.settings.host)
            : null,
        ]

  if (status?.success && status.models) {
    parts.push(formatCount(status.models.length, "model"))
  }

  return parts.filter(Boolean).join(" · ")
}

export type ProviderStatusTone = "danger" | "neutral" | "success" | "warning"

/** Badge shown for a provider connection check. */
export function getProviderStatus(
  status: ModelProviderCheckResult | undefined,
  isChecking: boolean,
): { label: string; tone: ProviderStatusTone } {
  if (isChecking || !status) {
    return { label: "Checking…", tone: "neutral" }
  }

  if (status.success) {
    return { label: "Connected", tone: "success" }
  }

  if (
    /\b401\b|\b403\b|unauthori[sz]ed|invalid.*key|api key/i.test(status.message)
  ) {
    return { label: "Invalid key", tone: "danger" }
  }

  return { label: "Offline", tone: "warning" }
}
