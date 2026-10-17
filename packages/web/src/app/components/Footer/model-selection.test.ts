import type { Chat } from "@pilot43/protocol"

import { describe, expect, it } from "vitest"

import type { ModelProviderModels } from "../../../queries/modelProvider"

import {
  getChatModelSelection,
  getNewChatModelSelection,
  isSameModelSelection,
  resolveAvailableModel,
} from "./model-selection"

function chat(
  id: string,
  updatedAt: number,
  model?: Chat["settings"]["model"],
): Chat {
  return {
    id,
    settings: { model, tools: [] },
    title: id,
    updatedAt,
    workspaceId: "w",
  }
}

const groups = [
  {
    models: [
      { id: "p1::gpt-5", name: "gpt-5", providerId: "p1" },
      { id: "p1::gpt-4.1", name: "gpt-4.1", providerId: "p1" },
    ],
    provider: { id: "p1", name: "OpenAI" },
  },
] as ModelProviderModels[]

describe("model selection", () => {
  it("prefers the chat's saved model over its last run", () => {
    expect(
      getChatModelSelection(
        chat("c", 1, { name: "gpt-4.1", providerId: "p1" }),
        [
          {
            createdAt: 1,
            modelMeta: { name: "gpt-5", provider: "p1", settings: {} },
          } as never,
        ],
      ),
    ).toEqual({ name: "gpt-4.1", providerId: "p1" })
  })

  it("starts new chats with the model of the most recent chat", () => {
    expect(
      getNewChatModelSelection([
        chat("old", 1, { name: "gpt-4.1", providerId: "p1" }),
        chat("new", 5, { name: "gpt-5", providerId: "p1" }),
        chat("newest-without-model", 9),
      ]),
    ).toEqual({ name: "gpt-5", providerId: "p1" })
  })

  it("falls back to the first model when the saved one is gone", () => {
    expect(
      resolveAvailableModel(groups, { name: "gone", providerId: "p9" }),
    ).toEqual({
      name: "gpt-5",
      providerId: "p1",
    })
    expect(resolveAvailableModel(groups, undefined)).toEqual({
      name: "gpt-5",
      providerId: "p1",
    })
  })

  it("compares selections including reasoning settings", () => {
    const base = { name: "gpt-5", providerId: "p1" }

    expect(isSameModelSelection(base, { ...base, settings: {} })).toBe(true)
    expect(
      isSameModelSelection(base, {
        ...base,
        settings: { reasoningEffort: "high" },
      }),
    ).toBe(false)
  })
})
