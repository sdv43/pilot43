import type { JsonObject, JsonValue, ParseError } from "../types"

/** Result of a JSON parse attempt. */
export interface ParseResult {
  value: JsonValue | undefined
  error: null | ParseError
}

/**
 * Parse a JSON string with detailed error location info.
 *
 * A small recursive-descent parser is used (instead of relying only on
 * `JSON.parse` error messages, whose position info differs across engines) so
 * the offender line/column is always available — which the error tooltip needs
 * to position itself relative to the caret.
 */
export function parseJson(text: string): ParseResult {
  if (text.trim() === "") {
    return { value: undefined, error: null }
  }

  const parser = new JsonParser(text)
  const value = parser.parseValue()
  parser.skipWhitespace()

  if (parser.failed) {
    return {
      value: undefined,
      error: makeError(parser.failure.message, parser.failure.offset, text),
    }
  }

  if (!parser.atEnd()) {
    const offset = parser.pos
    return {
      value: undefined,
      error: makeError(
        "Unexpected trailing content after JSON value",
        offset,
        text,
      ),
    }
  }

  return { value, error: null }
}

function makeError(message: string, offset: number, text: string): ParseError {
  const { line, column } = getLineColFromOffset(text, offset)
  return { message, line, column, offset }
}

/** A lightweight recursive-descent JSON parser that records exact failure offsets. */
class JsonParser {
  pos = 0
  failed = false
  failure: { message: string; offset: number } = { message: "", offset: 0 }

  private readonly text: string

  constructor(text: string) {
    this.text = text
  }

  skipWhitespace(): void {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) {
      this.pos++
    }
  }

  fail(message: string): undefined {
    if (!this.failed) {
      this.failed = true
      this.failure = { message, offset: this.pos }
    }
    return undefined
  }

  atEnd(): boolean {
    return this.pos >= this.text.length
  }

  peek(): string {
    return this.text[this.pos]
  }

  parseValue(): JsonValue | undefined {
    this.skipWhitespace()

    if (this.atEnd()) {
      return this.fail("Unexpected end of input")
    }

    const ch = this.text[this.pos]

    if (ch === "{") return this.parseObject()
    if (ch === "[") return this.parseArray()
    if (ch === '"') return this.parseString()
    if (ch === "-" || (ch >= "0" && ch <= "9")) return this.parseNumber()
    if (this.text.startsWith("true", this.pos)) {
      this.pos += 4
      return true
    }
    if (this.text.startsWith("false", this.pos)) {
      this.pos += 5
      return false
    }
    if (this.text.startsWith("null", this.pos)) {
      this.pos += 4
      return null
    }

    return this.fail(`Unexpected token '${ch}'`)
  }

  parseObject(): JsonObject | undefined {
    this.pos++ // consume "{"
    const obj: JsonObject = {}

    this.skipWhitespace()
    if (this.peek() === "}") {
      this.pos++
      return obj
    }

    for (;;) {
      this.skipWhitespace()
      if (this.peek() !== '"') {
        return this.fail("Expected double-quoted property name")
      }
      const key = this.parseString()
      if (this.failed || key === undefined) return undefined

      this.skipWhitespace()
      if (this.peek() !== ":") {
        return this.fail("Expected ':' after property name")
      }
      this.pos++

      const value = this.parseValue()
      if (this.failed || value === undefined) return undefined
      obj[key] = value

      this.skipWhitespace()
      const ch = this.peek()
      if (ch === ",") {
        this.pos++
        continue
      }
      if (ch === "}") {
        this.pos++
        return obj
      }
      return this.fail(
        this.atEnd()
          ? "Unexpected end of input"
          : "Expected ',' or '}' after property value",
      )
    }
  }

  parseArray(): JsonValue[] | undefined {
    this.pos++ // consume "["
    const arr: JsonValue[] = []

    this.skipWhitespace()
    if (this.peek() === "]") {
      this.pos++
      return arr
    }

    for (;;) {
      this.skipWhitespace()
      const value = this.parseValue()
      if (this.failed || value === undefined) return undefined
      arr.push(value)

      this.skipWhitespace()
      const ch = this.peek()
      if (ch === ",") {
        this.pos++
        continue
      }
      if (ch === "]") {
        this.pos++
        return arr
      }
      return this.fail(
        this.atEnd()
          ? "Unexpected end of input"
          : "Expected ',' or ']' after array element",
      )
    }
  }

  parseString(): string | undefined {
    this.pos++ // consume opening quote
    let str = ""

    for (;;) {
      if (this.atEnd()) {
        return this.fail("Unterminated string")
      }

      const ch = this.text[this.pos]

      if (ch === '"') {
        this.pos++
        return str
      }

      if (ch === "\\") {
        const escaped = this.parseEscape()
        if (this.failed) return undefined
        str += escaped
        continue
      }

      if (ch < " ") {
        return this.fail("Invalid control character in string")
      }

      str += ch
      this.pos++
    }
  }

  parseEscape(): string | undefined {
    this.pos++ // consume backslash
    if (this.atEnd()) return this.fail("Unterminated escape sequence")

    const ch = this.text[this.pos]

    switch (ch) {
      case '"':
      case "\\":
      case "/":
        this.pos++
        return ch
      case "b":
        this.pos++
        return "\b"
      case "f":
        this.pos++
        return "\f"
      case "n":
        this.pos++
        return "\n"
      case "r":
        this.pos++
        return "\r"
      case "t":
        this.pos++
        return "\t"
      case "u": {
        this.pos++
        const hex = this.text.slice(this.pos, this.pos + 4)
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          return this.fail("Invalid Unicode escape")
        }
        this.pos += 4
        return String.fromCharCode(parseInt(hex, 16))
      }
      default:
        return this.fail(`Invalid escape character '\\${ch}'`)
    }
  }

  parseNumber(): number | undefined {
    const start = this.pos
    const re = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/
    const match = re.exec(this.text.slice(this.pos))
    if (!match || match[0] === "") {
      this.pos = start
      return this.fail("Invalid number")
    }
    this.pos += match[0].length
    return Number(match[0])
  }
}

/** Convert a character offset to line/column (both 1-based). */
export function getLineColFromOffset(
  text: string,
  offset: number,
): { line: number; column: number } {
  let line = 1
  let lastNewline = -1

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++
      lastNewline = i
    }
  }

  return { line, column: offset - lastNewline }
}

/** Convert line/column (1-based) to a character offset. */
export function getOffsetFromLineCol(
  text: string,
  line: number,
  column: number,
): number {
  let currentLine = 1
  for (let i = 0; i < text.length; i++) {
    if (currentLine === line) {
      return i + column - 1
    }
    if (text[i] === "\n") {
      currentLine++
    }
  }
  return text.length
}

/**
 * Stringify a value to formatted JSON text.
 */
export function stringifyJson(
  value: JsonValue | undefined,
  indent: number | string = 2,
): string {
  if (value === undefined) return ""
  try {
    return JSON.stringify(value, null, indent)
  } catch {
    return ""
  }
}
