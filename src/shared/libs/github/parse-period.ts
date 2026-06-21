import type { PeriodInput } from "./types"

const PERIOD_REGEX =
  /^(?<count>\d+)\s*(?<unit>day|days|week|weeks|month|months|year|years)$/i

const UNIT_TO_DAYS: Record<string, number> = {
  day: 1,
  days: 1,
  month: 30,
  months: 30,
  week: 7,
  weeks: 7,
  year: 365,
  years: 365,
}

/**
 * Converts a `PeriodInput` into an ISO 8601 timestamp string usable as the
 * `since` parameter of GitHub list endpoints.
 *
 * Accepts:
 * - A `Date` instance (used as-is).
 * - A duration string like `3 months`, `2 weeks`, `10 days`, `1 year`
 *   (case-insensitive, singular or plural).
 * - A raw ISO 8601 date string, returned unchanged after validation.
 */
export function parsePeriodToSince(period: PeriodInput): string {
  if (period instanceof Date) {
    if (Number.isNaN(period.getTime())) {
      throw new Error("Period Date is invalid.")
    }
    return period.toISOString()
  }

  if (typeof period !== "string" || !period.trim()) {
    throw new Error(
      "Period must be a Date or a non-empty string like `3 months`.",
    )
  }

  const trimmed = period.trim()

  const durationMatch = PERIOD_REGEX.exec(trimmed)
  if (durationMatch && durationMatch.groups) {
    const count = Number.parseInt(durationMatch.groups.count, 10)
    const unitKey = durationMatch.groups.unit.toLowerCase()
    const daysPerUnit = UNIT_TO_DAYS[unitKey]

    if (!Number.isFinite(count) || count <= 0 || daysPerUnit === undefined) {
      throw new Error(`Unsupported period duration: \`${period}\`.`)
    }

    const ms = count * daysPerUnit * 24 * 60 * 60 * 1000
    return new Date(Date.now() - ms).toISOString()
  }

  const parsedDate = new Date(trimmed)
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(
      `Unsupported period value: \`${period}\`. Use a Date, an ISO date string, or a duration like \`3 months\`.`,
    )
  }

  return parsedDate.toISOString()
}
