import type { CSSProperties, Ref } from "react"

import type { JSONSchema, ValidationError } from "./core/validator"

export type JsonPrimitive = boolean | null | number | string

export interface JsonObject {
  [key: string]: JsonValue
}

export interface JsonArray extends Array<JsonValue> {}

export type JsonValue = JsonArray | JsonObject | JsonPrimitive

export type JsonCodeEditorValue = JsonValue | string

/** Position of a cursor in the code editor. */
export interface CursorPosition {
  /** 1-based line */
  line: number
  /** 1-based column */
  column: number
  /** 0-based character offset across the whole text */
  offset: number
}

/** A JSON parse error with location info. */
export interface ParseError {
  /** Human readable message */
  message: string
  /** 1-based line */
  line: number
  /** 1-based column */
  column: number
  /** 0-based character offset across the whole text */
  offset: number
}

/** Props for the JsonCodeEditor component. */
export interface JsonCodeEditorProps {
  /**
   * The JSON value — can be a parsed object/array or a raw JSON string.
   * When omitted the editor starts empty and stays uncontrolled.
   */
  value?: JsonCodeEditorValue
  /** Called when the JSON value changes (undefined when the text is invalid). */
  onChange?: (value: JsonValue | undefined, rawText: string) => void
  /** JSON Schema used for validation. */
  schema?: JSONSchema
  /** Editor height — CSS value or pixel number. */
  height?: number | string
  /** If true the editor is read-only. */
  readOnly?: boolean
  /** Indentation size in spaces. */
  indentation?: number
  /** Show line numbers in the gutter. */
  lineNumbers?: boolean
  /** Called when validation completes. */
  onValidate?: (errors: ValidationError[]) => void
  /** Optional CSS class applied to the root element. */
  className?: string
  /** Inline styles applied to the root element. */
  style?: CSSProperties
  /** Imperative handle exposed via `ref`. */
  ref?: Ref<JsonCodeEditorHandle>
}

/** Imperative methods available through the editor's `ref`. */
export interface JsonCodeEditorHandle {
  /**
   * Pretty-print the current document using the editor's indentation.
   * Updates the editor's visible text only — it intentionally does NOT fire
   * `onChange`, so callers can format and then save exactly once.
   */
  format: () => void
}
