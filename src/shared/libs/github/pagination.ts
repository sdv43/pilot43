import type { PaginationParams } from "./types"

export const defaultPerPage = 30
export const maxPerPage = 100
export const minPerPage = 1
export const minPage = 1

/**
 * Normalizes pagination parameters, applying defaults and clamping values to
 * GitHub's supported ranges.
 */
export function normalizePagination(
  params?: PaginationParams,
): Required<PaginationParams> {
  const rawPage = params?.page
  const rawPerPage = params?.perPage

  const page =
    typeof rawPage === "number" && Number.isFinite(rawPage)
      ? Math.max(minPage, Math.floor(rawPage))
      : minPage

  const perPage =
    typeof rawPerPage === "number" && Number.isFinite(rawPerPage)
      ? Math.min(maxPerPage, Math.max(minPerPage, Math.floor(rawPerPage)))
      : defaultPerPage

  return { page, perPage }
}

interface ParsedLinkHeader {
  first?: number
  last?: number
  next?: number
  prev?: number
}

const LINK_REL_REGEX = /<([^>]+)>;\s*rel="([^"]+)"/gi

/**
 * Parses an HTTP `Link` header into a map of rel -> page number.
 *
 * GitHub returns pagination links in the `Link` header using the standard
 * `rel="next"`, `rel="prev"`, `rel="first"`, and `rel="last"` convention.
 */
export function parseLinkHeader(
  link: null | string | undefined,
): ParsedLinkHeader {
  if (!link) {
    return {}
  }

  const result: ParsedLinkHeader = {}
  const matches = link.matchAll(LINK_REL_REGEX)

  for (const match of matches) {
    if (!match[1] || !match[2]) {
      continue
    }

    const url = match[1]
    const rel = match[2].toLowerCase() as keyof ParsedLinkHeader
    const page = extractPageFromUrl(url)
    if (page !== undefined) {
      result[rel] = page
    }
  }

  return result
}

function extractPageFromUrl(url: string): number | undefined {
  const queryIndex = url.indexOf("?")
  if (queryIndex === -1) {
    return undefined
  }

  const searchParams = new URLSearchParams(url.slice(queryIndex + 1))
  const pageValue = searchParams.get("page")
  if (pageValue === null) {
    return undefined
  }

  const page = Number.parseInt(pageValue, 10)
  return Number.isFinite(page) ? page : undefined
}
