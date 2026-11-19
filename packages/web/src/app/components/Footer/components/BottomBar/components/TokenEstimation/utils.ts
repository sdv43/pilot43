export function formatEstimate(
  estimate: number,
  isApproximate: boolean,
): string {
  const prefix = isApproximate ? "~" : ""

  if (estimate < 1000) {
    return `${prefix}${estimate}`
  }

  const compactEstimate = Math.round((estimate / 1000) * 10) / 10
  const formatted = Number.isInteger(compactEstimate)
    ? compactEstimate.toFixed(0)
    : compactEstimate.toFixed(1)

  return `${prefix}${formatted}k`
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
