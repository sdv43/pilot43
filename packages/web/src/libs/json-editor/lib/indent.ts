/**
 * Utilities for auto-indenting lines on line breaks inside the JSON editor.
 */

/**
 * Count the bracket nesting depth of a JSON prefix. Brackets inside string
 * literals are ignored so indentation is not skewed by e.g. `"}"` or an
 * escaped quote `\"` appearing as part of a string value.
 */
export function depthOf(prefix: string): number {
  let depth = 0
  let inString = false
  let escaped = false
  for (const ch of prefix) {
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === "{" || ch === "[") {
      depth++
    } else if (ch === "}" || ch === "]") {
      depth = Math.max(0, depth - 1)
    }
  }
  return depth
}
