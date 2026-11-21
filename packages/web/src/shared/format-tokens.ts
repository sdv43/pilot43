/** Compact token count: `950`, `12.4k`, `400k`, `1M`, `1.5M`. */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return String(count)
  }

  const thousands = Math.round(count / 100) / 10

  if (thousands < 1000) {
    return `${formatDecimal(thousands)}k`
  }

  return `${formatDecimal(Math.round(count / 100_000) / 10)}M`
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}
