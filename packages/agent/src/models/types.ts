import type {
  FileAttachment,
  ModelReasoningCapability,
  ReasoningEffort,
} from "@pilot43/protocol"

import type { ToolInputSchema } from "../tools/types"

export interface ChatToolCall {
  arguments: string
  id: string
  name: string
}

export interface ChatAssistantMessage {
  content: string
  role: "assistant"
  toolCalls?: ChatToolCall[]
  /**
   * Reasoning of the reply, set only while its run continues (see
   * `MessageAssistant.reasoningDetails`). Adapters send back what their
   * provider supports.
   */
  reasoning?: {
    /** Provider-specific reasoning blocks (OpenRouter `reasoning_details`). */
    details?: Record<string, unknown>[]
    /** Plain reasoning text (e.g. Ollama `thinking`). */
    text?: string
  }
}

export interface ChatToolMessage {
  content: string
  role: "tool"
  toolCallId?: string
  toolName: string
}

export interface ChatSystemMessage {
  content: string
  role: "system"
}

export interface ChatUserMessage {
  content: string
  images?: FileAttachment[]
  role: "user"
}

// Unified chat message format
export type ChatMessage =
  ChatAssistantMessage | ChatSystemMessage | ChatToolMessage | ChatUserMessage

export interface ChatToolDefinition {
  description: string
  inputSchema: ToolInputSchema
  name: string
}

export interface StreamUsage {
  completionTokens?: number
  promptTokens?: number
}

/**
 * Why the model stopped generating, normalized across providers. `length`
 * means the reply hit the output token limit and was cut off.
 */
export type FinishReason = "length" | "other" | "stop" | "tool_calls"

// Stream chunk from model
export interface StreamChunk {
  content: string
  done: boolean
  /** Set on the `done` chunk when the provider reported it. */
  finishReason?: FinishReason
  /**
   * Provider-specific reasoning blocks of the reply so far, cumulative like
   * `toolCalls` (OpenRouter `reasoning_details`).
   */
  reasoningDetails?: Record<string, unknown>[]
  toolCalls?: ChatToolCall[]
  usage?: StreamUsage
  /**
   * Incremental reasoning/thinking text emitted by models that expose a
   * separate reasoning trace (e.g. OpenAI `choice.delta.reasoning` or
   * Ollama `chunk.message.thinking`).
   */
  thoughts?: string
}

// Model adapter interface
export interface ModelAdapter {
  chat(
    messages: ChatMessage[],
    config?: CompletionConfig,
  ): AsyncIterable<StreamChunk>
  /**
   * List available models for the underlying provider. Returns provider-local
   * model id and display name.
   */
  listModels(): Promise<
    {
      contextWindow?: number
      id: string
      name: string
      reasoning?: ModelReasoningCapability
    }[]
  >
}

// Completion configuration
export interface CompletionConfig {
  thinking?: boolean
  reasoningEffort?: null | ReasoningEffort
  temperature?: number
  maxTokens?: number
  topP?: number
  tools?: ChatToolDefinition[]
  /**
   * Stable id of the conversation (the chat id). Providers that support it
   * route a session's requests to the same backend for prompt cache hits.
   */
  sessionId?: string
  /**
   * Optional abort signal used to cancel an in-progress streaming response.
   */
  signal?: AbortSignal
}

/** Maps a provider's finish reason to a {@link FinishReason}. */
export function toFinishReason(
  value: null | string | undefined,
): FinishReason | undefined {
  switch (value) {
    case null:
    case undefined:
    case "":
      return undefined
    case "length":
    case "max_tokens":
      return "length"
    case "stop":
    case "end_turn":
      return "stop"
    case "tool_calls":
    case "function_call":
      return "tool_calls"
    default:
      return "other"
  }
}
