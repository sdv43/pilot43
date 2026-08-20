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
