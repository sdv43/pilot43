import type {
  Chat,
  FollowupQuestion,
  MessageAssistant,
  MessageAssistantTool,
  MessageRun,
} from "@pilot43/protocol"

import type { ChatToolCall } from "../models"
import type {
  Tool,
  ToolCallRequest,
  ToolContext,
  ToolPolicy,
  ToolResult,
  Toolset,
} from "./types"

import { MessageRunStoppedError } from "./errors"
import { parseToolArguments, validateToolArguments } from "./executors/shared"

export interface ToolCallsExecution {
  chatId: Chat["id"]
  messageRunId: MessageRun["id"]
  signal: AbortSignal
  policy?: ToolPolicy
  /**
   * Implements {@link ToolContext.askUser} for the tool call recorded in
   * `entry`.
   */
  askUser: (
    entry: MessageAssistantTool,
    question: FollowupQuestion,
  ) => Promise<string>
}

/**
 * Resolves the tools available to the model in a chat: the enabled built-in
 * tools followed by the tools of the toolset's providers.
 *
 * Hidden built-in tools are always enabled. Other built-in tools follow the
 * chat's per-tool override, falling back to the tool's default. Providers
 * apply their own enablement rules and return only enabled tools.
 */
export async function getEnabledTools(
  chat: Chat,
  toolset: Toolset,
): Promise<Tool[]> {
  const enabledByToolName = new Map(
    chat.settings.tools.map((tool) => [tool.name, tool.enabled]),
  )

  const builtin = toolset.tools.filter(
    (tool) =>
      tool.definition.hidden ||
      (enabledByToolName.get(tool.definition.name) ??
        tool.definition.defaultEnabled ??
        true),
  )

  const provided = await Promise.all(
    toolset.providers.map((provider) => provider.resolveTools(chat)),
  )

  return [...builtin, ...provided.flat()]
}

/**
 * Executes the tool calls of one model round trip and records their results
 * on the assistant message. Sequential tools run first, one at a time in call
 * order; the remaining calls then run concurrently and are recorded in call
 * order. Validation and execution errors are captured per call so one failure
 * never aborts the whole batch.
 *
 * Returns `stopped: true` when the run was stopped while a tool waited for the
 * user; calls that haven't started by then are not executed.
 */
export async function executeToolCalls(
  toolCalls: ChatToolCall[],
  enabledTools: Tool[],
  assistantMessage: MessageAssistant,
  execution: ToolCallsExecution,
): Promise<{ stopped: boolean }> {
  const toolByName = new Map(
    enabledTools.map((tool) => [tool.definition.name, tool]),
  )
  const isSequential = (toolCall: ChatToolCall) =>
    toolByName.get(toolCall.name)?.execution === "sequential"

  for (const toolCall of toolCalls.filter(isSequential)) {
    const entry = createToolEntry(toolCall)
    const stopped = await executeToolCall(
      toolCall,
      toolByName.get(toolCall.name),
      entry,
      execution,
    )

    recordToolEntry(assistantMessage, entry)

    if (stopped) {
      return { stopped: true }
    }
  }

  if (execution.signal.aborted) {
    return { stopped: true }
  }

  const parallelCalls = toolCalls.filter((toolCall) => !isSequential(toolCall))
  const entries = parallelCalls.map(createToolEntry)

  const outcomes = await Promise.all(
    parallelCalls.map((toolCall, index) =>
      executeToolCall(
        toolCall,
        toolByName.get(toolCall.name),
        entries[index],
        execution,
      ),
    ),
  )

  entries.forEach((entry) => {
    recordToolEntry(assistantMessage, entry)
  })

  return { stopped: outcomes.some(Boolean) }
}

function createToolEntry(toolCall: ChatToolCall): MessageAssistantTool {
  return {
    // Guarantee a stable id so the reconstructed conversation history can match
    // the assistant tool call to its tool result message even when a provider
    // omits the tool call id.
    id: toolCall.id || `${toolCall.name}-${crypto.randomUUID()}`,
    args: null,
    name: toolCall.name,
    result: null,
  }
}

/**
 * Adds the entry to the assistant message unless it is already there (a tool
 * waiting for the user is recorded as soon as the question is shown).
 */
function recordToolEntry(
  assistantMessage: MessageAssistant,
  entry: MessageAssistantTool,
) {
  if (!assistantMessage.tools.includes(entry)) {
    assistantMessage.tools.push(entry)
  }
}

/**
 * Runs a single tool call and stores its arguments and result on `entry`.
 * Returns `true` when the run was stopped while the tool waited for the user.
 */
async function executeToolCall(
  toolCall: ChatToolCall,
  tool: Tool | undefined,
  entry: MessageAssistantTool,
  execution: ToolCallsExecution,
): Promise<boolean> {
  try {
    if (!tool) {
      throw new Error(`Tool \`${toolCall.name}\` is not enabled.`)
    }

    const args = parseToolArguments(toolCall.arguments)
    entry.args = args

    if (tool.validateArgs) {
      tool.validateArgs(args)
    } else {
      validateToolArguments(tool.inputSchema, args)
    }

    const request: ToolCallRequest = { args, tool }
    const context: ToolContext = {
      askUser: (question) => execution.askUser(entry, question),
      chatId: execution.chatId,
      messageRunId: execution.messageRunId,
      signal: execution.signal,
    }

    const decision = await execution.policy?.beforeExecute?.(request, context)

    if (decision && !decision.allow) {
      entry.result = { error: decision.reason, ok: false }
      return false
    }

    const result = await tool.execute(args, context)
    entry.result = result

    await notifyAfterExecute(execution.policy, request, result, context)
  } catch (error) {
    if (error instanceof MessageRunStoppedError) {
      return true
    }

    entry.result = {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    }
  }

  return false
}

async function notifyAfterExecute(
  policy: ToolPolicy | undefined,
  request: ToolCallRequest,
  result: ToolResult,
  context: ToolContext,
) {
  try {
    await policy?.afterExecute?.(request, result, context)
  } catch (error) {
    // The tool already ran; a failing hook must not change its result.
    console.error("Tool policy afterExecute failed:", error)
  }
}
