import { describe, expect, it } from "vitest"

import type { EditorCommandOption } from "./types"

import { getPromptAttachmentTokens } from "./prompt-insertion"

const commands = [
  {
    attachment: { id: 1, title: "Docs", url: "https://a.dev" },
    command: "Docs",
    key: "page:1",
    type: "hash",
  },
  {
    attachment: { active: true, id: 2, title: "Acme", url: "https://acme.com" },
    command: "Acme_pricing",
    key: "page:2",
    type: "hash",
  },
  {
    attachment: { content: "Usage-based pricing" },
    command: "selection:Usage",
    key: "selection:abc",
    type: "hash",
  },
] as unknown as EditorCommandOption[]

describe("getPromptAttachmentTokens", () => {
  it("adds the active tab and the selection when asked", () => {
    expect(
      getPromptAttachmentTokens(
        { attach: { currentTab: true, selection: true } },
        commands,
      ),
    ).toEqual(["#Acme_pricing", "#selection:Usage"])
  })

  it("adds nothing without attach settings or a selection", () => {
    expect(getPromptAttachmentTokens({}, commands)).toEqual([])
    expect(
      getPromptAttachmentTokens({ attach: { selection: true } }, [
        { ...commands[2], disabled: true },
      ]),
    ).toEqual([])
  })
})
