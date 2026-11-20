import type {
  MessageAssistant,
  MessageAssistantTool,
  MessageRun,
  MessageUserAnswer,
} from "@pilot43/protocol"

import type { AgentStep } from "../AgentSteps"
import type { GeneratedFileCardProps } from "../GeneratedFileCard"

export function getGeneratedFileToolResults(
  tools: MessageAssistantTool[],
): GeneratedFileCardProps[] {
  return tools.flatMap((tool) => {
    if (tool.name !== "generate_file" || !tool.result?.ok) {
      return []
    }

    const fileId = tool.result["fileId"]
    const filename = tool.result["filename"]
    const mimeType = tool.result["mimeType"]
    const size = tool.result["size"]

    if (
      typeof fileId !== "string" ||
      typeof filename !== "string" ||
      typeof mimeType !== "string" ||
      typeof size !== "number"
    ) {
      return []
    }

    return [{ fileId, filename, mimeType, size }]
  })
}

/**
 * Tool calls shown as steps: files appear as cards, questions as the
 * question form and plans in the plan tab instead.
 */
export function isStepTool(tool: MessageAssistantTool) {
  return (
    (tool.name !== "generate_file" || tool.result?.ok === false) &&
    tool.name !== "ask_followup_question" &&
    tool.name !== "update_todo_list"
  )
}

/**
 * Text the model wrote before calling tools is an interim note; text that
 * ends its turn (no calls, or only a question for the user) is the answer.
 * Text introducing a call that waits for approval stays visible until the
 * user decides: it is the context for the decision.
 */
function isInterimMessage(message: MessageAssistant) {
  return (
    message.tools.some((tool) => tool.name !== "ask_followup_question") &&
    !message.tools.some((tool) => tool.status === "awaiting_approval")
  )
}

export type RunBlock =
  | { files: GeneratedFileCardProps[]; id: string; kind: "files" }
  | { id: string; kind: "answer"; message: MessageAssistant }
  | { id: string; kind: "approval"; tool: MessageAssistantTool }
  | { id: string; kind: "steps"; steps: AgentStep[] }
  | { id: string; kind: "user_answer"; message: MessageUserAnswer }

/**
 * What a run shows under the prompt, in order: consecutive steps grouped
 * into one timeline, answers, and the user's answers to questions. Files and
 * calls waiting for approval stay visible after the steps that made them.
 */
export function buildRunBlocks(run: MessageRun): RunBlock[] {
  const blocks: RunBlock[] = []
  const isGenerating = run.status === "pending" || run.status === "running"
  const lastIndex = run.assistantMessages.length - 1
  let outputs: RunBlock[] = []

  function flushOutputs() {
    blocks.push(...outputs)
    outputs = []
  }

  function pushStep(step: AgentStep) {
    const last = blocks.at(-1)

    if (last?.kind === "steps") {
      last.steps.push(step)
    } else {
      blocks.push({ id: step.id, kind: "steps", steps: [step] })
    }
  }

  run.assistantMessages.forEach((message, index) => {
    if (message.role === "user_answer") {
      flushOutputs()
      blocks.push({ id: message.id, kind: "user_answer", message })

      return
    }

    if (message.thoughts) {
      pushStep({
        id: `${message.id}:thoughts`,
        isThinking:
          isGenerating &&
          index === lastIndex &&
          !message.content &&
          message.tools.length === 0,
        kind: "thought",
        thinkingMs: message.thinkingMs,
        thoughts: message.thoughts,
      })
    }

    if (message.content) {
      if (isInterimMessage(message)) {
        pushStep({
          content: message.content,
          id: `${message.id}:content`,
          kind: "note",
        })
      } else {
        blocks.push({ id: message.id, kind: "answer", message })
      }
    }

    message.tools.forEach((tool, toolIndex) => {
      const id = tool.id ?? `${message.id}:tool:${toolIndex}`

      if (tool.status === "awaiting_approval") {
        outputs.push({ id, kind: "approval", tool })
      } else if (isStepTool(tool)) {
        pushStep({ id, kind: "tool", tool })
      }
    })

    const files = getGeneratedFileToolResults(message.tools)

    if (files.length > 0) {
      outputs.push({ files, id: `${message.id}:files`, kind: "files" })
    }
  })

  flushOutputs()

  return blocks
}

/**
 * Index of the steps the agent is still working on: the last timeline,
 * unless the user has answered a question since. -1 when there is none.
 */
export function getLiveStepsIndex(blocks: RunBlock[]) {
  const index = blocks.findLastIndex((block) => block.kind === "steps")
  const isAnsweredSince = blocks
    .slice(index + 1)
    .some((block) => block.kind === "user_answer")

  return index === -1 || isAnsweredSince ? -1 : index
}
