import { formatTokenCount } from "../../../../../../../shared/format-tokens"

export function formatEstimate(
  estimate: number,
  isApproximate: boolean,
): string {
  return `${isApproximate ? "~" : ""}${formatTokenCount(estimate)}`
}

/** Share of the context window used, or null when the window is unknown. */
export function getContextUsage(
  estimate: number,
  contextWindow: number | undefined,
) {
  if (!contextWindow) {
    return null
  }

  const percent = Math.min(100, Math.round((estimate / contextWindow) * 100))

  return { isHigh: percent >= 80, percent }
}
