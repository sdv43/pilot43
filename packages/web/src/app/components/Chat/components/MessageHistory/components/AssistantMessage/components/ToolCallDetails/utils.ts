export function stringifyToolPayload(value: unknown) {
  return JSON.stringify(value ?? null, null, 2) ?? "null"
}
