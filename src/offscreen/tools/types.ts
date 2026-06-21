import type { ModelTool } from "@/shared/api"

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
