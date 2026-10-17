import { describe, expect, it } from "vitest"

import {
  formatFollowupAnswers,
  getFollowupQuestionItems,
} from "./followup-questions"

describe("getFollowupQuestionItems", () => {
  it("converts the older single-question format", () => {
    expect(
      getFollowupQuestionItems({
        followUp: [{ text: "main" }, { text: "develop" }],
        question: "Which branch?",
      }),
    ).toEqual([
      {
        header: "Question",
        multiple: false,
        options: [{ label: "main" }, { label: "develop" }],
        question: "Which branch?",
      },
    ])
  })
})

describe("formatFollowupAnswers", () => {
  it("answers a single question with its answer", () => {
    expect(
      formatFollowupAnswers([
        { header: "Branch", question: "Which branch?", selected: ["main"] },
      ]),
    ).toBe("main")
  })

  it("numbers several answers and marks skipped ones", () => {
    expect(
      formatFollowupAnswers([
        { header: "Branch", question: "Which branch?", selected: ["main"] },
        {
          header: "Notes",
          question: "What should the notes include?",
          selected: ["Fix summary", "Link to issue #142"],
          text: "Mention chunked export.",
        },
        {
          header: "Reviewer",
          question: "Who reviews?",
          selected: [],
          skipped: true,
        },
      ]),
    ).toBe(
      "1. Which branch?\nmain\n\n2. What should the notes include?\nFix summary; Link to issue #142. Note: Mention chunked export.\n\n3. Who reviews?\nThe user skipped this question.",
    )
  })

  it("uses free text alone when no option was picked", () => {
    expect(
      formatFollowupAnswers([
        { header: "Q", question: "Q?", selected: [], text: "Something else" },
      ]),
    ).toBe("Something else")
  })
})
