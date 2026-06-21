import type { ToolInputSchema } from "../types"

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function matchesSchemaType(
  value: unknown,
  expectedType: ToolInputSchema["properties"][string]["type"],
): boolean {
  switch (expectedType) {
    case "boolean":
      return typeof value === "boolean"
    case "number":
      return typeof value === "number" && Number.isFinite(value)
    case "object":
      // Accept both plain objects and arrays. Some tools (e.g.
      // ask_followup_question's `follow_up`) declare their array parameter as
      // type "object" because the schema type union does not include "array".
      return isPlainObject(value) || Array.isArray(value)
    case "string":
      return typeof value === "string"
  }
}

export function getOptionalNonEmptyString(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = args[key]
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Parameter \`${key}\` must be a non-empty string.`)
  }

  return value
}

export function parseHttpUrl(value: string, key: string): URL {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error(`Parameter \`${key}\` must be a valid absolute URL.`)
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https URLs are supported.")
  }

  return parsedUrl
}

export function truncateToolText(
  value: null | string | undefined,
  maxCharacters: number,
): { truncated: boolean; value: null | string | undefined } {
  if (typeof value !== "string" || value.length <= maxCharacters) {
    return { truncated: false, value }
  }

  return {
    truncated: true,
    value: value.slice(0, maxCharacters),
  }
}

export function requireStringArg(
  args: Record<string, unknown>,
  key: string,
): string {
  const value = args[key]
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Parameter \`${key}\` must be a non-empty string.`)
  }
  return value
}

export function requireStringValue(
  args: Record<string, unknown>,
  key: string,
): string {
  const value = args[key]
  if (typeof value !== "string") {
    throw new Error(`Parameter \`${key}\` must be a string.`)
  }
  return value
}

export function parseToolArguments(
  rawArguments: string,
): Record<string, unknown> {
  if (!rawArguments.trim()) {
    return {}
  }

  const parsedValue = JSON.parse(rawArguments) as unknown
  if (!isPlainObject(parsedValue)) {
    throw new Error("Tool arguments must be a JSON object.")
  }

  return parsedValue
}

export function validateToolArguments(
  schema: ToolInputSchema,
  args: Record<string, unknown>,
) {
  const missingParameters = schema.required.filter((key) => !(key in args))
  if (missingParameters.length > 0) {
    throw new Error(
      `Missing required parameter: ${missingParameters.join(", ")}.`,
    )
  }

  Object.entries(args).forEach(([key, value]) => {
    const propertySchema = schema.properties[key]
    if (!propertySchema) {
      throw new Error(`Unexpected parameter: ${key}.`)
    }

    if (!matchesSchemaType(value, propertySchema.type)) {
      throw new Error(
        `Parameter \`${key}\` must be of type ${propertySchema.type}.`,
      )
    }
  })
}
