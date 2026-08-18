/** Validation error with location and context. */
export interface ValidationError {
  /** Human-readable error message */
  message: string
  /** JSONPath to the offending value (e.g., "$.address.zip") */
  path: string
  /** Severity level */
  severity: "error" | "info" | "warning"
  /** The JSON Schema keyword that failed (e.g., "minimum", "required") */
  schemaKeyword?: string
  /** The schema rule that was violated */
  schemaRule?: unknown
  /** The actual value that failed validation */
  actualValue?: unknown
}

/** Loose JSON Schema type for broad draft support. */
export type JSONSchema = Record<string, unknown> & {
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  items?: JSONSchema | JSONSchema[]
  required?: string[]
  $ref?: string
  $schema?: string
}

/** Result from the validation engine. */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validate a parsed JSON value against a JSON Schema (Draft-07 compatible subset).
 */
export function validateSchema(
  value: unknown,
  schema: JSONSchema,
  path: string = "$",
): ValidationResult {
  const errors: ValidationError[] = []

  if (value === undefined || value === null) {
    if (schema.type && schema.type !== "null") {
      errors.push(
        makeError(
          `Expected type "${String(schema.type)}", got null`,
          path,
          "type",
          schema.type,
        ),
      )
    }
    return { valid: errors.length === 0, errors }
  }

  // Type validation
  if (schema.type) {
    const actualType = getJsonType(value)
    const rawTypes = Array.isArray(schema.type) ? schema.type : [schema.type]
    const allowedTypes: string[] = rawTypes.map((t) => String(t))
    // Per JSON Schema spec, "integer" is a subtype of "number"
    const typeMatches =
      allowedTypes.includes(actualType) ||
      (actualType === "integer" && allowedTypes.includes("number"))
    if (!typeMatches) {
      errors.push(
        makeError(
          `Expected type "${allowedTypes.join(" | ")}", got "${actualType}"`,
          path,
          "type",
          schema.type,
          value,
        ),
      )
    }
  }

  // Enum validation
  if (schema.enum && Array.isArray(schema.enum)) {
    if (!schema.enum.some((e) => deepEqual(e, value))) {
      errors.push(
        makeError(
          `Value must be one of: ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}`,
          path,
          "enum",
          schema.enum,
          value,
        ),
      )
    }
  }

  // String validations
  if (typeof value === "string") {
    const minLength = schema.minLength as number | undefined
    if (minLength !== undefined && value.length < minLength) {
      errors.push(
        makeError(
          `String must be at least ${minLength} characters`,
          path,
          "minLength",
          minLength,
          value,
        ),
      )
    }
    const maxLength = schema.maxLength as number | undefined
    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(
        makeError(
          `String must be at most ${maxLength} characters`,
          path,
          "maxLength",
          maxLength,
          value,
        ),
      )
    }
    const pattern = schema.pattern as string | undefined
    if (pattern) {
      const re = new RegExp(pattern)
      if (!re.test(value)) {
        errors.push(
          makeError(
            `String must match pattern "${pattern}"`,
            path,
            "pattern",
            pattern,
            value,
          ),
        )
      }
    }
  }

  // Number validations
  if (typeof value === "number") {
    const minimum = schema.minimum as number | undefined
    if (minimum !== undefined && value < minimum) {
      errors.push(
        makeError(
          `Value must be >= ${minimum}`,
          path,
          "minimum",
          minimum,
          value,
        ),
      )
    }
    const maximum = schema.maximum as number | undefined
    if (maximum !== undefined && value > maximum) {
      errors.push(
        makeError(
          `Value must be <= ${maximum}`,
          path,
          "maximum",
          maximum,
          value,
        ),
      )
    }
    const exclusiveMinimum = schema.exclusiveMinimum as number | undefined
    if (exclusiveMinimum !== undefined && value <= exclusiveMinimum) {
      errors.push(
        makeError(
          `Value must be > ${exclusiveMinimum}`,
          path,
          "exclusiveMinimum",
          exclusiveMinimum,
          value,
        ),
      )
    }
    const exclusiveMaximum = schema.exclusiveMaximum as number | undefined
    if (exclusiveMaximum !== undefined && value >= exclusiveMaximum) {
      errors.push(
        makeError(
          `Value must be < ${exclusiveMaximum}`,
          path,
          "exclusiveMaximum",
          exclusiveMaximum,
          value,
        ),
      )
    }
    const multipleOf = schema.multipleOf as number | undefined
    if (multipleOf !== undefined && value % multipleOf !== 0) {
      errors.push(
        makeError(
          `Value must be a multiple of ${multipleOf}`,
          path,
          "multipleOf",
          multipleOf,
          value,
        ),
      )
    }
  }

  // Array validations
  if (Array.isArray(value)) {
    const minItems = schema.minItems as number | undefined
    if (minItems !== undefined && value.length < minItems) {
      errors.push(
        makeError(
          `Array must have at least ${minItems} items`,
          path,
          "minItems",
          minItems,
          value,
        ),
      )
    }
    const maxItems = schema.maxItems as number | undefined
    if (maxItems !== undefined && value.length > maxItems) {
      errors.push(
        makeError(
          `Array must have at most ${maxItems} items`,
          path,
          "maxItems",
          maxItems,
          value,
        ),
      )
    }
    if (
      schema.uniqueItems &&
      new Set(value.map((v: unknown) => JSON.stringify(v))).size !==
        value.length
    ) {
      errors.push(
        makeError(
          "Array items must be unique",
          path,
          "uniqueItems",
          true,
          value,
        ),
      )
    }
    // Validate items against the item schema
    if (schema.items && !Array.isArray(schema.items)) {
      value.forEach((item, index) => {
        const result = validateSchema(
          item,
          schema.items as JSONSchema,
          `${path}[${index}]`,
        )
        errors.push(...result.errors)
      })
    }
  }

  // Object validations
  if (isPlainObject(value)) {
    const obj = value
    const keys = Object.keys(obj)

    if (schema.required && Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (!(req in obj)) {
          errors.push(
            makeError(
              `Missing required property "${req}"`,
              path,
              "required",
              schema.required,
            ),
          )
        }
      }
    }

    const minProperties = schema.minProperties as number | undefined
    if (minProperties !== undefined && keys.length < minProperties) {
      errors.push(
        makeError(
          `Object must have at least ${minProperties} properties`,
          path,
          "minProperties",
          minProperties,
          value,
        ),
      )
    }

    const maxProperties = schema.maxProperties as number | undefined
    if (maxProperties !== undefined && keys.length > maxProperties) {
      errors.push(
        makeError(
          `Object must have at most ${maxProperties} properties`,
          path,
          "maxProperties",
          maxProperties,
          value,
        ),
      )
    }

    // Validate each property
    if (schema.properties) {
      const props = schema.properties
      for (const key of keys) {
        if (props[key]) {
          const result = validateSchema(obj[key], props[key], `${path}.${key}`)
          errors.push(...result.errors)
        } else if (schema.additionalProperties === false) {
          errors.push(
            makeError(
              `Unexpected property "${key}"`,
              `${path}.${key}`,
              "additionalProperties",
              false,
              obj[key],
            ),
          )
        } else if (isPlainObject(schema.additionalProperties)) {
          // Validate values of additional properties against a schema
          const result = validateSchema(
            obj[key],
            schema.additionalProperties,
            `${path}.${key}`,
          )
          errors.push(...result.errors)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// --- Helpers ---

function getJsonType(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number"
  }
  return typeof value
}

function makeError(
  message: string,
  path: string,
  schemaKeyword: string,
  schemaRule?: unknown,
  actualValue?: unknown,
): ValidationError {
  return {
    message,
    path,
    severity: "error",
    schemaKeyword,
    schemaRule,
    actualValue,
  }
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (typeof a !== "object") return false
  return JSON.stringify(a) === JSON.stringify(b)
}
