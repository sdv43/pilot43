import { describe, expect, it } from "vitest"

import { migrateCommandToPrompt } from "./migrations"

describe("migrateCommandToPrompt", () => {
  it("turns a slash command into an editable prompt", () => {
    expect(
      migrateCommandToPrompt({
        builtin: false,
        description: "Review a pull request",
        id: "cmd-1",
        name: "review-pr",
        prompt: "Review the attached pull request for bugs.",
      }),
    ).toEqual({
      builtin: false,
      id: "cmd-1",
      legacyCommandName: "review-pr",
      text: "Review the attached pull request for bugs.",
      title: "review-pr",
    })
  })
})
