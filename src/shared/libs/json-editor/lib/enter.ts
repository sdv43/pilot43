import { depthOf } from "./indent"

export interface LineBreakInsertion {
  caretOffset: number
  nextText: string
}

/**
 * Build the next editor value after Enter, preserving code-editor behavior
 * when the caret sits directly before a closing bracket.
 */
export function computeLineBreakInsertion(
  text: string,
  start: number,
  end: number,
  indentation: number,
): LineBreakInsertion {
  const prefix = text.substring(0, start)
  const suffix = text.substring(end)
  const indentUnit = " ".repeat(indentation)
  const depth = depthOf(prefix)
  const nextLineIndent = indentUnit.repeat(depth)
  const closingLineIndent = indentUnit.repeat(Math.max(0, depth - 1))
  const lineStart = prefix.lastIndexOf("\n") + 1
  const linePrefix = prefix.substring(lineStart)
  const closingBracketMatch =
    start === end ? suffix.match(/^([ \t]*)([\]}])/) : null

  if (!closingBracketMatch) {
    return {
      caretOffset: start + 1 + nextLineIndent.length,
      nextText: `${prefix}\n${nextLineIndent}${suffix}`,
    }
  }

  const normalizedSuffix = suffix.substring(closingBracketMatch[1].length)

  if (linePrefix.trim() === "") {
    const beforeCurrentLine = prefix.substring(0, lineStart)
    return {
      caretOffset: beforeCurrentLine.length + nextLineIndent.length,
      nextText: `${beforeCurrentLine}${nextLineIndent}\n${closingLineIndent}${normalizedSuffix}`,
    }
  }

  return {
    caretOffset: start + 1 + nextLineIndent.length,
    nextText: `${prefix}\n${nextLineIndent}\n${closingLineIndent}${normalizedSuffix}`,
  }
}
