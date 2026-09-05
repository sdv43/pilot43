import type { FileAttachment } from "@/shared/api"

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

// Stream chunk from model
export interface StreamChunk {
  content: string
  done: boolean
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
  listModels(): Promise<{ id: string; name: string }[]>
}

// Completion configuration
export interface CompletionConfig {
  thinking?: boolean
  temperature?: number
  maxTokens?: number
  topP?: number
  tools?: ChatToolDefinition[]
  /**
   * Optional abort signal used to cancel an in-progress streaming response.
   */
  signal?: AbortSignal
}
