import { describe, expect, it } from "vitest"

import { computeLineBreakInsertion } from "./enter"

describe("computeLineBreakInsertion", () => {
  it("inserts an indented newline for regular Enter", () => {
    const result = computeLineBreakInsertion('{"a": {', 7, 7, 2)

    expect(result).toEqual({
      caretOffset: 12,
      nextText: '{"a": {\n    ',
    })
  })

  it("moves an inline closing brace onto the next line", () => {
    const result = computeLineBreakInsertion("{}", 1, 1, 2)

    expect(result).toEqual({
      caretOffset: 4,
      nextText: "{\n  \n}",
    })
  })

  it("preserves the parent indentation for the moved closing bracket", () => {
    const text = '{\n  "config": {}}'
    const start = text.indexOf("}")
    const result = computeLineBreakInsertion(text, start, start, 2)

    expect(result).toEqual({
      caretOffset: start + 5,
      nextText: '{\n  "config": {\n    \n  }}',
    })
  })

  it("reuses the current line when Enter is pressed before a closing brace", () => {
    const result = computeLineBreakInsertion("{\n}", 2, 2, 2)

    expect(result).toEqual({
      caretOffset: 4,
      nextText: "{\n  \n}",
    })
  })

  it("handles a closing bracket followed by a newline", () => {
    const result = computeLineBreakInsertion('{\n  "a": {}\n}', 10, 10, 2)

    expect(result).toEqual({
      caretOffset: 15,
      nextText: '{\n  "a": {\n    \n  }\n}',
    })
  })
})
