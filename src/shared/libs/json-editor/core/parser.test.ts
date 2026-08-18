import { describe, expect, it } from "vitest"

import { parseJson } from "./parser"

const VALID_CASES = [
  "{}",
  "[]",
  '"str"',
  "123",
  "-1.5e3",
  "true",
  "false",
  "null",
  '{"a":1,"b":[1,2,{"c":"d"}]}',
  '{\n  "a": 1\n}',
  '"\\u00e9\\n\\""',
  "[0,-0,1.2,1e10,0.5]",
  "  \n { } \t ",
  '{"servers":{"a":{"type":"http","url":"https://x.com"}}}',
]

const INVALID_CASES = [
  "abc",
  "{",
  "}",
  "[",
  '{"a":}',
  '{"a":1,}',
  '{"a"}',
  '{"a" 1}',
  "[1,]",
  "[1 2]",
  "01",
  "1.",
  ".5",
  "NaN",
  "Infinity",
  "undefined",
  '{"a":1, "b":}',
  '"unterminated',
  '["a","b"] extra',
  "true false",
  '{"a":1}{"b":2}',
]

describe("json-editor parser", () => {
  it.each(VALID_CASES)("accepts valid JSON: %s", (doc) => {
    const mine = parseJson(doc)
    expect(mine.error).toBeNull()
    expect(mine.value).toEqual(JSON.parse(doc))
  })

  it.each(INVALID_CASES)("rejects invalid JSON: %s", (doc) => {
    const mine = parseJson(doc)
    expect(mine.error).not.toBeNull()
  })

  it("treats empty input as valid-but-empty", () => {
    expect(parseJson("").error).toBeNull()
    expect(parseJson("   ").error).toBeNull()
    expect(parseJson("   ").value).toBeUndefined()
  })

  it("reports a precise line/column for errors", () => {
    const result = parseJson('{\n  "a": 1,\n  "b": }\n')
    expect(result.error).not.toBeNull()
    expect(result.error?.line).toBe(3)
  })
})
