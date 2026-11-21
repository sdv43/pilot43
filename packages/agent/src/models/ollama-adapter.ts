import type { OllamaModelProvider } from "@pilot43/protocol"

import { getFileAttachmentBase64Content } from "@pilot43/protocol"
import { Ollama } from "ollama/browser"

import type {
  ChatMessage,
  ChatToolCall,
  CompletionConfig,
  ListModelsOptions,
  ModelAdapter,
  StreamChunk,
} from "./types"

import { toFinishReason } from "./types"

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
      // Reasoning models (e.g. gpt-oss) keep their reasoning between tool
      // calls when it is sent back.
      ...(message.reasoning?.text ? { thinking: message.reasoning.text } : {}),
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
    const thinking =
      config?.thinking ??
      (config?.reasoningEffort === "none" ? false : undefined) ??
      true

    const stream = await this.client.chat({
      model: this.modelName,
      messages: messages.map((message) => toOllamaMessage(message)),
      stream: true,
      think: thinking,
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
      // Ollama emits tool calls per chunk, while consumers expect the
      // cumulative list (like the OpenAI-style adapters), so accumulate here.
      const accumulatedToolCalls: ChatToolCall[] = []

      for await (const chunk of stream) {
        const newToolCalls = chunk.message.tool_calls ?? []
        for (const toolCall of newToolCalls) {
          accumulatedToolCalls.push({
            arguments: JSON.stringify(toolCall.function.arguments ?? {}),
            id: crypto.randomUUID(),
            name: toolCall.function.name,
          })
        }
        const toolCalls = accumulatedToolCalls.length
          ? [...accumulatedToolCalls]
          : undefined

        const thoughts = chunk.message.thinking ?? ""

        if (
          !chunk.message.content &&
          !chunk.done &&
          !newToolCalls.length &&
          !thoughts
        ) {
          continue
        }

        yield {
          content: chunk.message.content,
          done: chunk.done,
          ...(chunk.done && toFinishReason(chunk.done_reason)
            ? { finishReason: toFinishReason(chunk.done_reason) }
            : {}),
          ...(chunk.done
            ? {
                usage: {
                  completionTokens: chunk.eval_count,
                  promptTokens: chunk.prompt_eval_count,
                },
              }
            : {}),
          ...(toolCalls ? { toolCalls } : {}),
          ...(thoughts ? { thoughts } : {}),
        }
      }
    } finally {
      if (config?.signal) {
        config.signal.removeEventListener("abort", onAbort)
      }
    }
  }

  async listModels(
    options?: ListModelsOptions,
  ): Promise<{ contextWindow?: number; id: string; name: string }[]> {
    const models = (await this.client.list())?.models ?? []

    return await Promise.all(
      models.map(async (m) => {
        const name = m.name ?? m.model
        const contextWindow = options?.contextWindows
          ? await this.getContextWindow(name)
          : undefined

        return {
          id: name,
          name,
          ...(contextWindow ? { contextWindow } : {}),
        }
      }),
    )
  }

  /** Context window from `/api/show`; undefined when it can't be read. */
  private async getContextWindow(model: string) {
    try {
      return getOllamaContextWindow(await this.client.show({ model }))
    } catch {
      return undefined
    }
  }
}

/**
 * Context window of an Ollama model: `num_ctx` when its Modelfile sets the
 * window Ollama runs it with, else the model's own maximum
 * (`<architecture>.context_length` in `model_info`).
 */
export function getOllamaContextWindow(show: {
  model_info?: unknown
  parameters?: string
}): number | undefined {
  const numCtx = /^\s*num_ctx\s+(\d+)\s*$/m.exec(show.parameters ?? "")?.[1]

  if (numCtx) {
    return Number(numCtx)
  }

  // Typed as a Map by the SDK, but a plain object in the JSON response.
  const entries: [string, unknown][] =
    show.model_info instanceof Map
      ? [...(show.model_info as Map<string, unknown>).entries()]
      : Object.entries((show.model_info ?? {}) as Record<string, unknown>)

  const length = entries.find(([key]) => key.endsWith(".context_length"))?.[1]

  return typeof length === "number" && length > 0 ? length : undefined
}
