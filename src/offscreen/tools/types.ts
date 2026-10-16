import type {
  Chat,
  FollowupQuestion,
  MessageRun,
  ModelTool,
} from "@pilot43/protocol"

import type {
  sandboxRequestType,
  sandboxResponseType,
  sandboxWorkerRequestType,
  sandboxWorkerResponseType,
} from "./const"

export interface ToolInputSchema {
  [key: string]: unknown
  additionalProperties: boolean
  properties: Record<
    string,
    {
      description: string
      type: "boolean" | "number" | "object" | "string"
    }
  >
  required: string[]
  type: "object"
}

export interface RegisteredToolDefinition {
  definition: ModelTool
  inputSchema: ToolInputSchema
  /**
   * Optional grouping key used by the tools UI to render related tools under a
   * collapsible group (e.g. `"github"`). Tools without a group are rendered as
   * standalone items.
   */
  group?: string
}

/**
 * JSON-serializable result of a tool call. It is persisted on the assistant
 * message and sent back to the model as the tool message content.
 */
export type ToolResult = Record<string, unknown>

/**
 * Per-call context passed to {@link Tool.execute}.
 */
export interface ToolContext {
  chatId: Chat["id"]
  messageRunId: MessageRun["id"]
  /** Aborted when the user stops the message run. */
  signal: AbortSignal
  /**
   * Pauses the message run, shows the question to the user and resolves with
   * their answer. The answer is also appended to the conversation so the model
   * sees it on the next turn. Rejects with {@link MessageRunStoppedError} when
   * the run is stopped while waiting; tools must let that error propagate.
   */
  askUser: (question: FollowupQuestion) => Promise<string>
}

/**
 * A tool the model can call. The platform composes the set of available tools
 * (see {@link Toolset}); the agent loop only relies on this interface.
 */
export interface Tool extends RegisteredToolDefinition {
  /**
   * `"sequential"` tools run one at a time, in call order, before the
   * `"parallel"` tools (default) of the same round trip, which run
   * concurrently. Use it for tools that interact with the user or must not
   * overlap with other tools.
   */
  execution?: "parallel" | "sequential"
  /**
   * Validates the parsed arguments, throwing an `Error` with a model-facing
   * message when they are invalid. Defaults to strict validation against
   * {@link RegisteredToolDefinition.inputSchema}.
   */
  validateArgs?: (args: Record<string, unknown>) => void
  execute: (
    args: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<ToolResult>
}

/**
 * Source of tools resolved per chat, e.g. the tools of the MCP servers enabled
 * in the chat.
 */
export interface ToolProvider {
  resolveTools: (chat: Chat) => Promise<Tool[]>
}

export interface ToolCallRequest {
  args: Record<string, unknown>
  tool: Tool
}

export type ToolCallDecision =
  { allow: false; reason: string } | { allow: true }

/**
 * Hooks around tool execution, e.g. to ask the user for approval before a
 * potentially destructive tool runs. Without a policy every call is allowed.
 */
export interface ToolPolicy {
  beforeExecute?: (
    request: ToolCallRequest,
    context: ToolContext,
  ) => Promise<ToolCallDecision>
  afterExecute?: (
    request: ToolCallRequest,
    result: ToolResult,
    context: ToolContext,
  ) => Promise<void>
}

/**
 * The tools available to the agent on a platform.
 */
export interface Toolset {
  /**
   * Built-in tools. Non-hidden ones are listed in the tools settings UI and
   * can be toggled per chat.
   */
  tools: Tool[]
  providers: ToolProvider[]
  policy?: ToolPolicy
}

export type SandboxedValue =
  | boolean
  | null
  | number
  | SandboxedValue[]
  | string
  | { [key: string]: SandboxedValue }

export interface SandboxedConsoleEntry {
  level: "debug" | "error" | "info" | "log" | "warn"
  values: SandboxedValue[]
}

export interface SandboxExecutionError {
  message: string
  name: string
  stack?: string
}

export interface RunJsExecutionFailure {
  durationMs: number
  error: SandboxExecutionError
  logs: SandboxedConsoleEntry[]
  ok: false
}

export interface RunJsExecutionSuccess {
  durationMs: number
  logs: SandboxedConsoleEntry[]
  ok: true
  value: SandboxedValue
}

export type RunJsExecutionResult = RunJsExecutionFailure | RunJsExecutionSuccess

export interface SandboxParentRequestMessage {
  id: string
  payload: {
    code: string
    timeoutMs: number
  }
  source: "pilot43-offscreen"
  type: typeof sandboxRequestType
}

export interface SandboxParentResponseMessage {
  id: string
  payload: RunJsExecutionResult
  source: "pilot43-sandbox"
  type: typeof sandboxResponseType
}

export interface SandboxWorkerRequestMessage {
  id: string
  payload: {
    code: string
  }
  type: typeof sandboxWorkerRequestType
}

export interface SandboxWorkerResponseMessage {
  id: string
  payload: RunJsExecutionResult
  type: typeof sandboxWorkerResponseType
}
