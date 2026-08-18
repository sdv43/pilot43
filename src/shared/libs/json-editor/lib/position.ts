/**
 * Utilities for positioning the error tooltip relative to the caret so it
 * never covers the typed cursor, even on narrow viewports.
 */

/** Line height used by the code display (px). Must match CSS font metrics. */
export const LINE_HEIGHT_PX = 20

/** Vertical gap between the caret row and the tooltip. */
export const TOOLTIP_GAP_PX = 4

/** Max tooltip height in px — used to decide above vs below placement. */
export const TOOLTIP_MAX_HEIGHT_PX = 72

/** Padding inside the viewport where the tooltip must remain visible. */
const MIN_EDGE_MARGIN_PX = 8

export interface TooltipPlacement {
  /** Which side of the caret the tooltip is rendered on. */
  side: "above" | "below"
  /** Absolute pixel position relative to the editor container (visible space). */
  top: number
  left: number
}

/** Round a number to avoid sub-pixel jitter. */
function round(n: number): number {
  return Math.round(n * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/**
 * Compute the tooltip placement in the editor's visible coordinate space.
 *
 * All `*Doc` inputs are relative to the scrollable content (before scroll is
 * applied); the viewport scroll position and size are used to convert them to
 * visible space and to decide whether to render below or above the caret.
 *
 * Returns `null` when the caret row is outside the visible viewport, in which
 * case the caller should hide the tooltip.
 */
export function computeTooltipPlacement(params: {
  /** Pixel top of the caret row in document (content) space. */
  caretRowDocTop: number
  /** Pixel left of the caret in document (content) space. */
  caretDocLeft: number
  /** Current vertical scroll position of the viewport. */
  scrollTop: number
  /** Current horizontal scroll position of the viewport. */
  scrollLeft: number
  /** Visible viewport width (px). */
  viewportWidth: number
  /** Visible viewport height (px). */
  viewportHeight: number
  /** Estimated tooltip width (px). */
  tooltipWidth: number
  /** Estimated tooltip height (px). */
  tooltipHeight?: number
}): null | TooltipPlacement {
  const {
    caretRowDocTop,
    caretDocLeft,
    scrollTop,
    scrollLeft,
    viewportWidth,
    viewportHeight,
    tooltipWidth,
    tooltipHeight = TOOLTIP_MAX_HEIGHT_PX,
  } = params

  // Caret row top/left in visible space.
  const caretVisibleTop = caretRowDocTop - scrollTop
  const caretVisibleLeft = caretDocLeft - scrollLeft

  // Hide the tooltip entirely when the caret row isn't on screen.
  if (caretVisibleTop < -LINE_HEIGHT_PX || caretVisibleTop > viewportHeight) {
    return null
  }

  // Clamp the tooltip horizontally so it stays fully visible.
  const maxLeft = viewportWidth - tooltipWidth - MIN_EDGE_MARGIN_PX
  const left = clamp(
    caretVisibleLeft,
    MIN_EDGE_MARGIN_PX,
    Math.max(MIN_EDGE_MARGIN_PX, maxLeft),
  )

  // Space available below the caret row in visible space.
  const spaceBelow = viewportHeight - (caretVisibleTop + LINE_HEIGHT_PX)

  if (spaceBelow >= tooltipHeight + TOOLTIP_GAP_PX) {
    // Place below the caret row.
    return {
      side: "below",
      top: round(caretVisibleTop + LINE_HEIGHT_PX + TOOLTIP_GAP_PX),
      left: round(left),
    }
  }

  // Place above the caret row, clamped so it stays on screen.
  const aboveTop = caretVisibleTop - tooltipHeight - TOOLTIP_GAP_PX
  if (aboveTop < MIN_EDGE_MARGIN_PX) {
    // Neither below nor above fits cleanly on screen — hide the tooltip.
    return null
  }
  return { side: "above", top: round(aboveTop), left: round(left) }
}
