import { describe, expect, it } from "vitest"

import { parseAskFollowupQuestionArgs } from "./ask-followup-question"

describe("parseAskFollowupQuestionArgs", () => {
  it("parses structured questions", () => {
    expect(
      parseAskFollowupQuestionArgs({
        questions: [
          {
            header: "Release type",
            multiple: false,
            options: [
              {
                description: "Bug fixes only",
                label: "Patch",
                recommended: true,
              },
              "Minor",
            ],
            question: "What kind of release is this?",
          },
          { question: "Anything else?" },
        ],
      }),
    ).toEqual({
      followUp: [{ text: "Patch" }, { text: "Minor" }],
      question: "What kind of release is this?",
      questions: [
        {
          header: "Release type",
          multiple: false,
          options: [
            {
              description: "Bug fixes only",
              label: "Patch",
              recommended: true,
            },
            { label: "Minor" },
          ],
          question: "What kind of release is this?",
        },
        {
          header: "Question 2",
          multiple: false,
          options: [],
          question: "Anything else?",
        },
      ],
    })
  })

  it("accepts JSON-encoded questions and the older format", () => {
    expect(
      parseAskFollowupQuestionArgs({
        questions: JSON.stringify([{ header: "Path", question: "Where?" }]),
      }).questions,
    ).toHaveLength(1)
    expect(
      parseAskFollowupQuestionArgs({
        follow_up: [{ text: "./config.json" }],
        question: "What is the path?",
      }),
    ).toEqual({
      followUp: [{ text: "./config.json" }],
      question: "What is the path?",
    })
  })

  it("rejects invalid questions", () => {
    expect(() => parseAskFollowupQuestionArgs({ questions: [] })).toThrow(
      "between 1 and 5",
    )
    expect(() =>
      parseAskFollowupQuestionArgs({ questions: [{ question: "" }] }),
    ).toThrow("questions[0].question")
  })
})
