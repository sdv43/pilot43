import { describe, expect, it } from "vitest"

import type { EditorCommandOption, EditorParsedCommand } from "../../types"

import { filterOptions, getActiveAutocompleteCommand } from "./utils"

describe("getActiveAutocompleteCommand", () => {
  it("does not offer slash autocomplete away from the start of the message", () => {
    const commands: EditorParsedCommand[] = [
      {
        key: "summarize",
        command: "summarize",
        type: "slash",
        start: 7,
        end: 17,
      },
    ]

    expect(
      getActiveAutocompleteCommand("please /summarize", commands, 17, 17),
    ).toBeNull()
  })

  it("keeps hash autocomplete available on word boundaries in the middle of a message", () => {
    const commands: EditorParsedCommand[] = [
      {
        key: "page:42",
        command: "page:42",
        type: "hash",
        start: 6,
        end: 14,
      },
    ]

    expect(
      getActiveAutocompleteCommand("hello #page:42", commands, 14, 14),
    ).toEqual({
      end: 14,
      kind: "hash",
      query: "page:42",
      start: 6,
    })
  })
})

describe("filterOptions", () => {
  it("filters options case-insensitively", () => {
    const options: EditorCommandOption[] = [
      { key: "alpha", command: "Alpha_Page", type: "hash" },
      { key: "beta", command: "beta_page", type: "hash" },
      { key: "slash", command: "summarize", type: "slash" },
    ]

    expect(
      filterOptions(options, {
        end: 0,
        kind: "hash",
        query: "ALPHA",
        start: 0,
      }),
    ).toEqual([{ key: "alpha", command: "Alpha_Page", type: "hash" }])
  })
})
