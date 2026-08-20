import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"

import type { JsonCodeEditorHandle, JsonCodeEditorProps } from "./types"

import { parseJson } from "./core/parser"
import { useJsonParser } from "./hooks/useJsonParser"
import { useUndoRedo } from "./hooks/useUndoRedo"
import s from "./JsonCodeEditor.module.css"
import { computeLineBreakInsertion } from "./lib/enter"
import { computeTooltipPlacement } from "./lib/position"

/**
 * A dependency-free JSON code editor built for this project as an in-house
 * replacement for `modern-json-react`.
 *
 * Deliberately minimal:
 * - No mode-switching toolbar.
 * - No bottom status bar.
 * - Parse errors are shown as a tooltip anchored to the offending line. The
 *   tooltip is placed below the caret when there is room and flipped above it
 *   otherwise, so it never covers the caret on narrow viewports.
 */
export function JsonCodeEditor({
  value: externalValue,
  onChange,
  schema,
  height = "100%",
  readOnly = false,
  indentation = 2,
  lineNumbers = true,
  onValidate,
  className = "",
  style,
  ref,
}: JsonCodeEditorProps) {
  const parser = useJsonParser(externalValue, { schema })
  const history = useUndoRedo<string>(
    { value: parser.text, caret: 0 },
    { maxHistory: 100 },
  )

  const displayRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const syncDisplayScroll = useCallback(() => {
    const display = displayRef.current
    const textarea = textareaRef.current
    if (!display || !textarea) return
    display.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`
  }, [])

  const moveCaretTo = useCallback(
    (position: number) => {
      requestAnimationFrame(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.selectionStart = textarea.selectionEnd = position
        syncDisplayScroll()
      })
    },
    [syncDisplayScroll],
  )

  // Expose an imperative API for external callers (e.g. format on demand).
  // Formatting replaces the editor's visible text without calling `onChange`,
  // so the caller (which already holds the latest parsed value) can persist it
  // exactly once — this avoids the double-save caused by onChange cascading.
  useImperativeHandle(
    ref,
    (): JsonCodeEditorHandle => ({
      format: () => {
        if (parser.parsedValue === undefined) return
        const formatted = JSON.stringify(parser.parsedValue, null, indentation)
        if (formatted === parser.text) return
        const caret = textareaRef.current?.selectionStart ?? 0
        history.set({ value: formatted, caret })
        parser.setText(formatted)
      },
    }),
  )

  // Sync external value changes — but only when the value actually changed vs.
  // the parsed document. Values echoed back by this editor's own `onChange`
  // are structurally identical to the current parse, so they are ignored and
  // the user's whitespace/formatting is preserved while typing.
  useEffect(() => {
    if (externalValue === undefined) return
    const text =
      typeof externalValue === "string"
        ? externalValue
        : JSON.stringify(externalValue, null, indentation)

    const isSameValue =
      typeof externalValue === "string"
        ? text === parser.text
        : JSON.stringify(externalValue) === JSON.stringify(parser.parsedValue)
    if (isSameValue || text === parser.text) return

    parser.setText(text)
    history.reset({ value: text, caret: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalValue])

  // Notify parent of text changes
  const handleTextChange = (text: string) => {
    parser.setText(text)
    const caret = textareaRef.current?.selectionStart ?? text.length
    history.set({ value: text, caret })

    if (onChange) {
      const result = parseJson(text)

      // Pass `undefined` when the text is not valid JSON so consumers can keep
      // the raw text but avoid treating it as a parsed value.
      onChange(result.error ? undefined : result.value, text)
    }
  }

  // Notify parent of validation results
  useEffect(() => {
    onValidate?.(parser.validationErrors)
  }, [parser.validationErrors, onValidate])

  // Global undo/redo shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.key.toLowerCase() !== "z") return
      e.preventDefault()
      const entry = e.shiftKey ? history.redo() : history.undo()
      if (entry === undefined) return
      parser.setText(entry.value)
      moveCaretTo(entry.caret)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [history, moveCaretTo, parser])

  // Tab indents; auto-close brackets
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return

    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const indent = " ".repeat(indentation)
      const newValue =
        parser.text.substring(0, start) + indent + parser.text.substring(end)
      handleTextChange(newValue)
      moveCaretTo(start + indent.length)
      return
    }

    // Auto-indent on line break: the new line gets `indentation` spaces for
    // every bracket nesting level open at the caret position. Brackets inside
    // string literals are ignored, so indentation is not skewed by e.g. `"}"`.
    if (e.key === "Enter") {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const nextLine = computeLineBreakInsertion(
        parser.text,
        start,
        end,
        indentation,
      )
      handleTextChange(nextLine.nextText)
      moveCaretTo(nextLine.caretOffset)
      return
    }

    if (e.key === "{" || e.key === "[" || e.key === '"') {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start !== end) return

      const closeChar = e.key === "{" ? "}" : e.key === "[" ? "]" : '"'
      e.preventDefault()
      const newValue =
        parser.text.substring(0, start) +
        e.key +
        closeChar +
        parser.text.substring(end)
      handleTextChange(newValue)
      moveCaretTo(start + 1)
    }
  }

  // Compute caret X for an error line (document space) by measuring the
  // rendered line content plus a mirror of the text before the caret column.
  const getCaretLeft = useCallback(
    (line: number, column: number): number => {
      const viewport = viewportRef.current
      if (!viewport) return 0

      const lines = parser.text.split("\n")
      const lineText = lines[line - 1] ?? ""
      const caretCol = Math.min(column, lineText.length + 1)
      const prefix = lineText.substring(0, caretCol - 1)

      const lineContentEl = viewport.querySelector<HTMLElement>(
        `[data-line="${line}"] [data-line-content="true"]`,
      )
      let contentLeft = 0
      if (lineContentEl) {
        const rect = lineContentEl.getBoundingClientRect()
        const viewportRect = viewport.getBoundingClientRect()
        contentLeft =
          rect.left - viewportRect.left + (textareaRef.current?.scrollLeft ?? 0)
      }

      const mirror = document.createElement("span")
      mirror.style.cssText = [
        "position:absolute",
        "left:-9999px",
        "top:0",
        "visibility:hidden",
        "white-space:pre",
        "font:inherit",
      ].join(";")
      mirror.textContent = prefix
      viewport.appendChild(mirror)
      const prefixWidth = mirror.getBoundingClientRect().width
      mirror.remove()

      return contentLeft + prefixWidth
    },
    [parser.text],
  )

  // Position the mounted tooltip element relative to the error line. Called in
  // effects and event handlers (including scroll/resize) — never during render.
  const positionTooltip = useCallback((): void => {
    const viewport = viewportRef.current
    const textarea = textareaRef.current
    const tooltip = tooltipRef.current
    if (!viewport || !textarea || !tooltip) return

    if (!parser.parseError) {
      tooltip.style.visibility = "hidden"
      return
    }

    const lineEl = viewport.querySelector<HTMLElement>(
      `[data-line="${parser.parseError.line}"]`,
    )
    if (!lineEl) {
      tooltip.style.visibility = "hidden"
      return
    }

    const lineRect = lineEl.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const caretRowDocTop = lineRect.top - viewportRect.top + textarea.scrollTop
    const caretDocLeft = getCaretLeft(
      parser.parseError.line,
      parser.parseError.column,
    )

    const placement = computeTooltipPlacement({
      caretRowDocTop,
      caretDocLeft,
      scrollTop: textarea.scrollTop,
      scrollLeft: textarea.scrollLeft,
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      tooltipWidth: tooltip.offsetWidth || 240,
      tooltipHeight: tooltip.offsetHeight || 60,
    })

    tooltip.style.visibility = "hidden"
    if (!placement) return

    tooltip.style.top = `${placement.top}px`
    tooltip.style.left = `${placement.left}px`
    tooltip.classList.remove(s.errorTooltipBelow, s.errorTooltipAbove)
    tooltip.classList.add(
      placement.side === "below" ? s.errorTooltipBelow : s.errorTooltipAbove,
    )
    tooltip.style.visibility = "visible"
  }, [getCaretLeft, parser.parseError])

  // Reposition whenever the error or text changes.
  useEffect(() => {
    syncDisplayScroll()
    if (!parser.parseError) return
    positionTooltip()
  }, [parser.parseError, parser.text, positionTooltip, syncDisplayScroll])

  // Keep the display layer and tooltip aligned with the textarea scroll.
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const handleScroll = () => {
      syncDisplayScroll()
      positionTooltip()
    }
    textarea.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", positionTooltip)
    return () => {
      textarea.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", positionTooltip)
    }
  }, [positionTooltip, syncDisplayScroll])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(positionTooltip)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [positionTooltip])

  // Highlighted lines
  const lines = useMemo(() => parser.text.split("\n"), [parser.text])
  const highlightedLines = useMemo(
    () =>
      lines.map((line, idx) => {
        const lineNum = idx + 1
        const isErrorLine = parser.parseError?.line === lineNum
        return (
          <div
            // The display layer is a static presentational mirror of the text
            // rebuilt whenever the text changes, so index keys are safe here.
            // eslint-disable-next-line @eslint-react/no-array-index-key -- presentational mirror keyed by line index
            key={idx}
            className={`${s.line} ${isErrorLine ? s.lineError : ""}`}
            data-line={lineNum}
          >
            {lineNumbers && (
              <span aria-hidden="true" className={s.lineNumber}>
                {lineNum}
              </span>
            )}
            <span className={s.lineContent} data-line-content="true">
              {highlightJsonLine(line)}
            </span>
          </div>
        )
      }),
    [lines, lineNumbers, parser.parseError],
  )

  const heightStyle = typeof height === "number" ? `${height}px` : height

  return (
    <div
      className={`${s.editor} ${className}`}
      data-testid="json-editor"
      style={{ ...style, height: heightStyle }}
    >
      <div ref={viewportRef} className={s.codeViewport}>
        <div ref={displayRef} aria-hidden="true" className={s.display}>
          {highlightedLines}
        </div>
        <textarea
          ref={textareaRef}
          aria-label="JSON code editor"
          aria-multiline="true"
          aria-readonly={readOnly}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={`${s.textarea} ${lineNumbers ? "" : s.noLineNumbers}`}
          data-testid="code-editor-textarea"
          readOnly={readOnly}
          spellCheck={false}
          value={parser.text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {parser.parseError && (
        <div ref={tooltipRef} className={s.errorTooltip} role="alert">
          Line {parser.parseError.line}, Col {parser.parseError.column}:{" "}
          {parser.parseError.message}
        </div>
      )}
    </div>
  )
}

/**
 * Simple JSON syntax highlighter — tokenizes a single line.
 */
function highlightJsonLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0
  let key = 0

  const cls = (name: string) => s[name as keyof typeof s]

  while (i < line.length) {
    const ch = line[i]

    // Whitespace
    if (ch === " " || ch === "\t") {
      let ws = ""
      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        ws += line[i]
        i++
      }
      tokens.push(<span key={key++}>{ws}</span>)
      continue
    }

    // Strings
    if (ch === '"') {
      let str = '"'
      i++
      while (i < line.length) {
        if (line[i] === "\\") {
          str += line[i] + (line[i + 1] || "")
          i += 2
          continue
        }
        str += line[i]
        if (line[i] === '"') {
          i++
          break
        }
        i++
      }

      // Check if this is a key (followed by colon)
      const rest = line.substring(i).trimStart()
      const isKey = rest.startsWith(":")
      tokens.push(
        <span
          key={key++}
          className={isKey ? cls("syntaxKey") : cls("syntaxString")}
        >
          {str}
        </span>,
      )
      continue
    }

    // Numbers
    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      let num = ""
      while (i < line.length && /[\d.eE+-]/.test(line[i])) {
        num += line[i]
        i++
      }
      tokens.push(
        <span key={key++} className={cls("syntaxNumber")}>
          {num}
        </span>,
      )
      continue
    }

    // Booleans
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

    // Null
    if (line.substring(i, i + 4) === "null") {
      tokens.push(
        <span key={key++} className={cls("syntaxNull")}>
          null
        </span>,
      )
      i += 4
      continue
    }

    // Brackets and structural characters
    if (ch === "{" || ch === "}" || ch === "[" || ch === "]") {
      tokens.push(
        <span key={key++} className={cls("syntaxBracket")}>
          {ch}
        </span>,
      )
      i++
      continue
    }

    // Colon and comma
    tokens.push(
      <span key={key++} className={cls("syntaxPunctuation")}>
        {ch}
      </span>,
    )
    i++
  }

  return tokens
}
