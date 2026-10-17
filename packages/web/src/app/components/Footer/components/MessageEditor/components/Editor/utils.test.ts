import { describe, expect, it } from "vitest"

import type { EditorCommandOption } from "./types"

import { prepareValue } from "./utils"

const commandOptions: EditorCommandOption[] = [
  {
    key: "summarize",
    command: "summarize",
    type: "slash",
  },
  {
    key: "page:alpha",
    command: "page:Alpha_Page",
    type: "hash",
  },
]

describe("prepareValue", () => {
  it("parses slash commands only at the start of the message", () => {
    expect(
      prepareValue(
        { commands: [], text: "/summarize this page" },
        commandOptions,
      ).commands,
    ).toMatchObject([
      {
        key: "summarize",
        command: "summarize",
        start: 0,
        end: 10,
        type: "slash",
      },
    ])

    expect(
      prepareValue(
        { commands: [], text: "please /summarize this page" },
        commandOptions,
      ).commands,
    ).toEqual([])
  })

  it("parses hash commands anywhere on a word boundary", () => {
    const value = prepareValue(
      {
        commands: [],
        text: "Before #page:Alpha_Page and after #selection:quoted_text",
      },
      commandOptions,
    )

    expect(value.commands).toMatchObject([
      {
        key: "page:alpha",
        command: "page:Alpha_Page",
        start: 7,
        end: 23,
        type: "hash",
      },
      {
        key: "selection:quoted_text",
        command: "selection:quoted_text",
        start: 34,
        end: 56,
        type: "hash",
      },
    ])
  })

  it("creates raw page and selection commands without a predefined option", () => {
    const value = prepareValue(
      {
        commands: [],
        text: "Look at #page:42 and #selection:important_text",
      },
      [],
    )

    expect(value.commands).toMatchObject([
      {
        key: "page:42",
        command: "page:42",
        type: "hash",
      },
      {
        key: "selection:important_text",
        command: "selection:important_text",
        type: "hash",
      },
    ])
  })
})
