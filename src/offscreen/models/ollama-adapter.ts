import { Ollama } from "ollama/browser"

import type { OllamaModelProvider } from "@/shared/api"

import { getFileAttachmentBase64Content } from "@/shared/message-content"

import type {
  ChatMessage,
  CompletionConfig,
  ModelAdapter,
  StreamChunk,
} from "./types"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseToolArguments(rawArguments: string): Record<string, unknown> {
  try {
    const parsedValue = JSON.parse(rawArguments) as unknown
    return isPlainObject(parsedValue) ? parsedValue : { value: parsedValue }
  } catch {
    return { raw: rawArguments }
  }
}

function toOllamaMessage(message: ChatMessage) {
  if (message.role === "assistant") {
    return {
      content: message.content,
      role: "assistant",
      ...(message.toolCalls?.length
        ? {
            tool_calls: message.toolCalls.map((toolCall) => ({
              function: {
                arguments: parseToolArguments(toolCall.arguments),
                name: toolCall.name,
              },
            })),
          }
        : {}),
    }
  }

  if (message.role === "tool") {
    return {
      content: message.content,
      role: "tool",
      tool_name: message.toolName,
    }
  }

  if (message.role === "user" && message.images?.length) {
    return {
      content: message.content,
      images: message.images.map((image) =>
        getFileAttachmentBase64Content(image),
      ),
      role: "user",
    }
  }

  return {
    content: message.content,
    role: message.role,
  }
}

function toOllamaTools(tools: CompletionConfig["tools"]) {
  return tools?.map((tool) => ({
    function: {
      description: tool.description,
      name: tool.name,
      parameters: tool.inputSchema,
    },
    type: "function",
  }))
}

export class OllamaAdapter implements ModelAdapter {
  private client: Ollama
  private modelName: string

  constructor(provider: OllamaModelProvider, modelName: string) {
    this.client = new Ollama({ host: provider.settings.host })
    this.modelName = modelName
  }

  async *chat(
    messages: ChatMessage[],
    config?: CompletionConfig,
  ): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat({
      model: this.modelName,
      messages: messages.map((message) => toOllamaMessage(message)),
      stream: true,
      think: config?.thinking ?? true,
      options: {
        temperature: config?.temperature,
        num_predict: config?.maxTokens,
        top_p: config?.topP,
      },
      ...(config?.tools ? { tools: toOllamaTools(config.tools) } : {}),
    })

    const onAbort = () => {
      if (typeof (stream as { abort?: () => void }).abort === "function") {
        ;(stream as { abort: () => void }).abort()
      }
    }

    if (config?.signal) {
      if (config.signal.aborted) {
        onAbort()
      } else {
        config.signal.addEventListener("abort", onAbort, { once: true })
      }
    }

    try {
      for await (const chunk of stream) {
        const toolCalls = chunk.message.tool_calls?.map((toolCall) => ({
          arguments: JSON.stringify(toolCall.function.arguments ?? {}),
          id: crypto.randomUUID(),
          name: toolCall.function.name,
        }))

        const thoughts = chunk.message.thinking ?? ""

        if (
          !chunk.message.content &&
          !chunk.done &&
          !toolCalls?.length &&
          !thoughts
        ) {
          continue
        }

        yield {
          content: chunk.message.content,
          done: chunk.done,
          ...(chunk.done
            ? {
                usage: {
                  completionTokens: chunk.eval_count,
                  promptTokens: chunk.prompt_eval_count,
                },
              }
            : {}),
          ...(toolCalls?.length ? { toolCalls } : {}),
          ...(thoughts ? { thoughts } : {}),
        }
      }
    } finally {
      if (config?.signal) {
        config.signal.removeEventListener("abort", onAbort)
      }
    }
  }

  async listModels(): Promise<{ id: string; name: string }[]> {
    const models = (await this.client.list())?.models ?? []

    return models.map((m) => ({
      id: m.name ?? m.model,
      name: m.name ?? m.model,
    }))
  }
}
