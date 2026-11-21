/** "Thought for 12 s" (or "Thoughts" for replies saved without a time). */
export function getThinkingSummary(thinkingMs: number | undefined) {
  if (thinkingMs === undefined) {
    return "Thoughts"
  }

  const seconds = Math.max(1, Math.round(thinkingMs / 1000))

  return seconds < 60
    ? `Thought for ${seconds} s`
    : `Thought for ${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

/** Latest part of the live thoughts: the end of the text, whole words. */
export function getThinkingPreview(thoughts: string, maxLength = 240) {
  const text = thoughts.replace(/\s+/g, " ").trim()

  if (text.length <= maxLength) {
    return text
  }

  const tail = text.slice(-maxLength)

  return `…${tail.slice(tail.indexOf(" ") + 1)}`
}
