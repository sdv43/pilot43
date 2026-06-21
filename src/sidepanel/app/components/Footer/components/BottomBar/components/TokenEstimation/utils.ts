export function formatEstimate(
  estimate: number,
  isApproximate: boolean,
): string {
  const prefix = isApproximate ? "~" : ""

  return estimate >= 1000
    ? `${prefix}${Math.round(estimate / 1000)}k`
    : `${prefix}${estimate}`
}
