import type {
  MessageAssistant,
  MessageAssistantTool,
  MessageRun,
} from "@pilot43/protocol"

import { describe, expect, it } from "vitest"

import { buildRunBlocks, getLiveStepsIndex } from "./utils"

function assistant(
  id: string,
  fields: Partial<MessageAssistant> = {},
): MessageAssistant {
  return {
    content: "",
    createdAt: 0,
    id,
    messageRunId: "mr1",
    role: "assistant",
    tools: [],
    ...fields,
  }
}

function tool(
  id: string,
  fields: Partial<MessageAssistantTool> = {},
): MessageAssistantTool {
  return {
    args: {},
    id,
    name: "mcp__github__search_issues",
    result: { ok: true },
    status: "completed",
    ...fields,
  }
}

function run(
  assistantMessages: MessageRun["assistantMessages"],
  status: MessageRun["status"] = "completed",
): MessageRun {
  return {
    assistantMessages,
    chatId: "c1",
    createdAt: 0,
    error: null,
    id: "mr1",
    modelMeta: { name: "gpt-5", provider: "p1", settings: {} },
    status,
    updatedAt: 0,
    userMessage: {
      attachments: [],
      content: "Hi",
      createdAt: 0,
      id: "um1",
      messageRunId: "mr1",
      role: "user",
    },
  }
}

function describeBlocks(messageRun: MessageRun) {
  return buildRunBlocks(messageRun).map((block) =>
    block.kind === "steps"
      ? `steps(${block.steps.map((step) => step.kind).join(",")})`
      : block.kind,
  )
}

describe("buildRunBlocks", () => {
  it("folds thoughts, interim text and tool calls before the answer", () => {
    const blocks = describeBlocks(
      run([
        assistant("a1", {
          content: "Searching first.",
          thoughts: "plan",
          tools: [tool("t1")],
        }),
        assistant("a2", { tools: [tool("t2"), tool("t3")] }),
        assistant("a3", { content: "Here is the answer.", thoughts: "ok" }),
      ]),
    )

    expect(blocks).toEqual([
      "steps(thought,note,tool,tool,tool,thought)",
      "answer",
    ])
  })

  it("keeps text that ends the turn as answers", () => {
    expect(
      describeBlocks(
        run([
          assistant("a1", { content: "One." }),
          assistant("a2", { content: "Two." }),
        ]),
      ),
    ).toEqual(["answer", "answer"])
  })

  it("keeps the text before a question visible", () => {
    expect(
      describeBlocks(
        run(
          [
            assistant("a1", {
              content: "A few questions:",
              tools: [tool("t1", { name: "ask_followup_question" })],
            }),
          ],
          "awaiting_input",
        ),
      ),
    ).toEqual(["answer"])
  })

  it("splits the timeline at the user's answers", () => {
    const blocks = describeBlocks(
      run([
        assistant("a1", { tools: [tool("t1")] }),
        assistant("a2", {
          content: "Which branch?",
          tools: [tool("t2", { name: "ask_followup_question" })],
        }),
        {
          content: "main",
          createdAt: 0,
          id: "ua1",
          messageRunId: "mr1",
          role: "user_answer",
        },
        assistant("a3", { tools: [tool("t3")] }),
        assistant("a4", { content: "Done." }),
      ]),
    )

    expect(blocks).toEqual([
      "steps(tool)",
      "answer",
      "user_answer",
      "steps(tool)",
      "answer",
    ])
  })

  it("shows files and approvals after the steps that made them", () => {
    const blocks = buildRunBlocks(
      run(
        [
          assistant("a1", {
            tools: [
              tool("t1", {
                name: "generate_file",
                result: {
                  fileId: "f1",
                  filename: "a.md",
                  mimeType: "text/markdown",
                  ok: true,
                  size: 1,
                },
              }),
              tool("t2", { name: "update_todo_list" }),
            ],
          }),
          assistant("a2", {
            tools: [
              tool("t3"),
              tool("t4", { result: null, status: "awaiting_approval" }),
            ],
          }),
        ],
        "awaiting_input",
      ),
    )

    expect(blocks.map((block) => block.kind)).toEqual([
      "steps",
      "files",
      "approval",
    ])
    expect(blocks[0]).toMatchObject({ steps: [{ id: "t3", kind: "tool" }] })
  })

  it("keeps the text before a call waiting for approval visible", () => {
    const message = assistant("a1", {
      content: "Here's the comment I'll post:",
      tools: [tool("t1", { result: null, status: "awaiting_approval" })],
    })

    expect(describeBlocks(run([message], "awaiting_input"))).toEqual([
      "answer",
      "approval",
    ])
    expect(
      describeBlocks(
        run([
          { ...message, tools: [tool("t1")] },
          assistant("a2", { content: "Posted." }),
        ]),
      ),
    ).toEqual(["steps(note,tool)", "answer"])
  })

  it("marks the last thoughts of a generating run as live", () => {
    const [block] = buildRunBlocks(
      run([assistant("a1", { thoughts: "hmm" })], "running"),
    )

    expect(block).toMatchObject({ steps: [{ isThinking: true }] })
    expect(
      buildRunBlocks(run([assistant("a1", { thoughts: "hmm" })]))[0],
    ).toMatchObject({ steps: [{ isThinking: false }] })
  })
})

describe("getLiveStepsIndex", () => {
  it("is the last timeline unless the user answered since", () => {
    expect(
      getLiveStepsIndex(
        buildRunBlocks(
          run([
            assistant("a1", { tools: [tool("t1")] }),
            assistant("a2", { content: "Hi" }),
          ]),
        ),
      ),
    ).toBe(0)
    expect(
      getLiveStepsIndex(
        buildRunBlocks(
          run([
            assistant("a1", { tools: [tool("t1")] }),
            {
              content: "main",
              createdAt: 0,
              id: "ua1",
              messageRunId: "mr1",
              role: "user_answer",
            },
          ]),
        ),
      ),
    ).toBe(-1)
    expect(getLiveStepsIndex([])).toBe(-1)
  })
})
