import type { OpenTab, PageContentSelection } from "@pilot43/protocol"

import { describe, expect, it } from "vitest"

import type { EditorCommandOption } from "../MessageEditor/components/Editor/types"

import { getAttachSuggestion, getSelectionPreview } from "./utils"

function createTabOption(tab: OpenTab): EditorCommandOption {
  return {
    attachment: tab,
    command: `page:${tab.title}`,
    key: `page:${tab.id}:${encodeURIComponent(tab.url)}`,
    type: "hash",
  }
}

function createSelectionOption(
  selection: null | PageContentSelection,
): EditorCommandOption {
  return {
    attachment: selection ?? undefined,
    command: selection ? "selection:text" : "selection:no_selection",
    disabled: !selection,
    key: `selection:${selection?.uniqueKey ?? "unavailable"}`,
    type: "hash",
  }
}

const activeTab = createTabOption({
  active: true,
  id: 1,
  title: "Docs",
  url: "https://example.com/docs",
})
const otherTab = createTabOption({
  id: 2,
  title: "Other",
  url: "https://example.com/other",
})
const selection = createSelectionOption({
  content: "Selected words",
  description: "",
  id: 1,
  title: "Docs",
  uniqueKey: "sel-1",
  url: "https://example.com/docs",
})
const noSelection = createSelectionOption(null)

describe("getAttachSuggestion", () => {
  it("offers the current tab when nothing is selected", () => {
    expect(getAttachSuggestion([otherTab, activeTab, noSelection], [])).toEqual(
      { kind: "tab", option: activeTab },
    )
  })

  it("offers the selection instead of the tab", () => {
    expect(getAttachSuggestion([activeTab, selection], [])).toEqual({
      kind: "selection",
      option: selection,
    })
  })

  it("falls back to the tab once the selection is attached", () => {
    expect(
      getAttachSuggestion([activeTab, selection], [selection.key]),
    ).toEqual({ kind: "tab", option: activeTab })
  })

  it("still offers the selection when the tab is attached", () => {
    expect(
      getAttachSuggestion([activeTab, selection], [activeTab.key]),
    ).toEqual({ kind: "selection", option: selection })
  })

  it("offers nothing once both are attached", () => {
    expect(
      getAttachSuggestion(
        [activeTab, selection],
        [activeTab.key, selection.key],
      ),
    ).toBeUndefined()
  })

  it("offers nothing without an active tab or a selection", () => {
    expect(getAttachSuggestion([otherTab, noSelection], [])).toBeUndefined()
  })
})

describe("getSelectionPreview", () => {
  it("collapses whitespace", () => {
    expect(getSelectionPreview("  one\n\ntwo\tthree ")).toBe("one two three")
  })

  it("cuts long text with an ellipsis", () => {
    expect(getSelectionPreview("abcdef ghij", 7)).toBe("abcdef…")
  })
})
