import { describe, expect, it } from "vitest"

import { depthOf } from "./indent"

describe("depthOf", () => {
  it("returns 0 for empty input", () => {
    expect(depthOf("")).toBe(0)
  })

  it("returns 0 when no brackets are open", () => {
    expect(depthOf('"abc"')).toBe(0)
    expect(depthOf("  123,\n")).toBe(0)
  })

  it("counts nested object depth", () => {
    expect(depthOf("{")).toBe(1)
    expect(depthOf('{\n  "a": {')).toBe(2)
    expect(depthOf('{\n  "a": {\n    "b": [')).toBe(3)
  })

  it("counts nested array depth", () => {
    expect(depthOf("[")).toBe(1)
    expect(depthOf("[\n  [")).toBe(2)
  })

  it("decrements depth on closing brackets", () => {
    expect(depthOf('{\n  "a": 1\n}')).toBe(0)
    expect(depthOf("{\n  [\n  ]")).toBe(1)
  })

  it("never goes below zero", () => {
    expect(depthOf("}")).toBe(0)
    expect(depthOf("]}")).toBe(0)
  })

  it("ignores brackets inside string literals", () => {
    // The `}` and `{` inside strings must not change the depth; the outer `{`
    // stays open, so depth is still 1.
    expect(depthOf('{ "brace": "}" ')).toBe(1)
    expect(depthOf('"{"')).toBe(0)
    expect(depthOf('"{}"')).toBe(0)
    expect(depthOf('{ "a": "1", "b": "2"')).toBe(1)
  })

  it("handles escaped quotes inside strings", () => {
    expect(depthOf('"hello \\"world\\""')).toBe(0)
    expect(depthOf('"escaped: \\" }"')).toBe(0)
  })

  it("tracks opening/closing across the whole prefix", () => {
    // A complete object has net depth 0 at the end.
    const doc = '{\n  "servers": [\n    {\n      "name": "a"\n    }\n  ]\n}'
    expect(depthOf(doc)).toBe(0)
    // But just inside the outer object (before the closing brace) is depth 1.
    expect(depthOf('{\n  "servers": [')).toBe(2)
    expect(depthOf('{\n  "servers": [\n    {')).toBe(3)
    // After "name" value (still inside inner object) stays at depth 3.
    expect(depthOf('{\n  "servers": [\n    {\n      "name": "a"')).toBe(3)
    // Closing the inner object brings us back to depth 2.
    expect(depthOf('{\n  "servers": [\n    {\n      "name": "a"\n    }')).toBe(
      2,
    )
  })
})
