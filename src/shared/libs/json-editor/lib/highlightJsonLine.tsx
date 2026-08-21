import type { ReactNode } from "react"

type HighlightClassName =
  | "syntaxBoolean"
  | "syntaxBracket"
  | "syntaxKey"
  | "syntaxNull"
  | "syntaxNumber"
  | "syntaxPunctuation"
  | "syntaxString"

type HighlightStyles = Record<string, string>

export function highlightJsonLine(
  line: string,
  styles: HighlightStyles,
): ReactNode[] {
  const tokens: ReactNode[] = []
  let i = 0
  let key = 0

  const cls = (name: HighlightClassName) => styles[name]

  while (i < line.length) {
    const ch = line[i]

    if (ch === " " || ch === "\t") {
      let whitespace = ""
      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        whitespace += line[i]
        i++
      }
      tokens.push(<span key={key++}>{whitespace}</span>)
      continue
    }

    if (ch === '"') {
      let stringValue = '"'
      i++
      while (i < line.length) {
        if (line[i] === "\\") {
          stringValue += line[i] + (line[i + 1] || "")
          i += 2
          continue
        }
        stringValue += line[i]
        if (line[i] === '"') {
          i++
          break
        }
        i++
      }

      const rest = line.substring(i).trimStart()
      const isKey = rest.startsWith(":")
      tokens.push(
        <span
          key={key++}
          className={isKey ? cls("syntaxKey") : cls("syntaxString")}
        >
          {stringValue}
        </span>,
      )
      continue
    }

    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      let numericValue = ""
      while (i < line.length && /[\d.eE+-]/.test(line[i])) {
        numericValue += line[i]
        i++
      }
      tokens.push(
        <span key={key++} className={cls("syntaxNumber")}>
          {numericValue}
        </span>,
      )
      continue
    }

    if (line.substring(i, i + 4) === "true") {
      tokens.push(
        <span key={key++} className={cls("syntaxBoolean")}>
          true
        </span>,
      )
      i += 4
      continue
    }

    if (line.substring(i, i + 5) === "false") {
      tokens.push(
        <span key={key++} className={cls("syntaxBoolean")}>
          false
        </span>,
      )
      i += 5
      continue
    }

    if (line.substring(i, i + 4) === "null") {
      tokens.push(
        <span key={key++} className={cls("syntaxNull")}>
          null
        </span>,
      )
      i += 4
      continue
    }

    if (ch === "{" || ch === "}" || ch === "[" || ch === "]") {
      tokens.push(
        <span key={key++} className={cls("syntaxBracket")}>
          {ch}
        </span>,
      )
      i++
      continue
    }

    tokens.push(
      <span key={key++} className={cls("syntaxPunctuation")}>
        {ch}
      </span>,
    )
    i++
  }

  return tokens
}
