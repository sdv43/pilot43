import { describe, expect, it } from "vitest"

import { toFollowupAnswer } from "./utils"

const single = {
  header: "Release",
  multiple: false,
  options: [{ label: "Patch" }],
  question: "What kind?",
}

describe("toFollowupAnswer", () => {
  it("uses the chosen option or the Other text", () => {
    expect(
      toFollowupAnswer(
        single,
        { isOther: false, selected: ["Patch"], text: "" },
        false,
      ),
    ).toEqual({
      header: "Release",
      question: "What kind?",
      selected: ["Patch"],
    })
    expect(
      toFollowupAnswer(
        single,
        { isOther: true, selected: ["Patch"], text: " Hotfix " },
        false,
      ),
    ).toEqual({
      header: "Release",
      question: "What kind?",
      selected: [],
      text: "Hotfix",
    })
  })

  it("marks skipped and empty questions as skipped", () => {
    expect(
      toFollowupAnswer(
        single,
        { isOther: false, selected: [], text: "" },
        false,
      ),
    ).toMatchObject({ skipped: true })
    expect(
      toFollowupAnswer(
        single,
        { isOther: false, selected: ["Patch"], text: "" },
        true,
      ),
    ).toMatchObject({ skipped: true })
  })
})
