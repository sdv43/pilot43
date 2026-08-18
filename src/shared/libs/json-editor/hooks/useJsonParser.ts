import { useCallback, useMemo, useState } from "react"

import type { ValidationError } from "../core/validator"
import type { ParseError } from "../types"

import { parseJson, stringifyJson } from "../core/parser"
import { validateSchema } from "../core/validator"

interface UseJsonParserOptions {
  /** JSON Schema for validation */
  schema?: Record<string, unknown>
}

interface UseJsonParserResult {
  /** The current raw text */
  text: string
  /** The parsed value (undefined if invalid) */
  parsedValue: unknown
  /** Parse error, if any */
  parseError: null | ParseError
  /** Validation errors from schema */
  validationErrors: ValidationError[]
  /** Whether the text is valid JSON */
  isValid: boolean
  /** Update the raw text */
  setText: (text: string) => void
  /** Update from a parsed value */
  setValue: (value: unknown) => void
  /** Format the current text */
  format: (indent?: number) => void
}

/**
 * Hook that manages JSON parsing and validation state.
 */
export function useJsonParser(
  initialValue?: unknown,
  options: UseJsonParserOptions = {},
): UseJsonParserResult {
  const { schema } = options

  const [text, setText] = useState<string>(() =>
    initialValue !== undefined ? stringifyJson(initialValue) : "",
  )

  // Parsing is synchronous — derive the parsed value and error directly from
  // the current text instead of storing them separately.
  const { value: parsedValue, error: parseError } = useMemo(
    () => parseJson(text),
    [text],
  )

  // Schema validation is synchronous and cheap for the document sizes this
  // editor is used with, so it's derived directly too (no debounce needed).
  const validationErrors = useMemo(() => {
    if (parseError || parsedValue === undefined || !schema) return []
    return validateSchema(parsedValue, schema).errors
  }, [parseError, parsedValue, schema])

  const handleSetText = useCallback((newText: string) => {
    setText(newText)
  }, [])

  const handleSetValue = useCallback((value: unknown) => {
    setText(stringifyJson(value))
  }, [])

  const format = useCallback(
    (indent: number = 2) => {
      if (parsedValue !== undefined) {
        setText(stringifyJson(parsedValue, indent))
      }
    },
    [parsedValue],
  )

  return {
    text,
    parsedValue,
    parseError,
    validationErrors,
    isValid: parseError === null && validationErrors.length === 0,
    setText: handleSetText,
    setValue: handleSetValue,
    format,
  }
}
