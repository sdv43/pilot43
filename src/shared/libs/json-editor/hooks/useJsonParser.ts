import { useCallback, useMemo, useState } from "react"

import type { JSONSchema, ValidationError } from "../core/validator"
import type { JsonCodeEditorValue, JsonValue, ParseError } from "../types"

import { parseJson, stringifyJson } from "../core/parser"
import { validateSchema } from "../core/validator"

interface UseJsonParserOptions {
  /** JSON Schema for validation */
  schema?: JSONSchema
}

interface UseJsonParserResult {
  /** The current raw text */
  text: string
  /** The parsed value (undefined if invalid) */
  parsedValue: JsonValue | undefined
  /** Parse error, if any */
  parseError: null | ParseError
  /** Validation errors from schema */
  validationErrors: ValidationError[]
  /** Whether the text is valid JSON */
  isValid: boolean
  /** Update the raw text */
  setText: (text: string) => void
  /** Update from a parsed value */
  setValue: (value: JsonValue) => void
  /** Format the current text */
  format: (indent?: number) => void
}

/**
 * Hook that manages JSON parsing and validation state.
 */
export function useJsonParser(
  initialValue?: JsonCodeEditorValue,
  options: UseJsonParserOptions = {},
): UseJsonParserResult {
  const { schema } = options

  const [text, setText] = useState<string>(() =>
    initialValue === undefined
      ? ""
      : typeof initialValue === "string"
        ? initialValue
        : stringifyJson(initialValue),
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

  const handleSetValue = useCallback((value: JsonValue) => {
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
