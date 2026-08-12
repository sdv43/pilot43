import { OpenRouter } from "@openrouter/sdk"

import type { OpenRouterModelProvider } from "@/shared/api"

import { getFileAttachmentDataUrl } from "@/shared/message-content"

import type {
  ChatMessage,
  ChatToolCall,
  CompletionConfig,
  ModelAdapter,
  StreamChunk,
} from "./types"

const openRouterAppTitle = "Pilot43"
const openRouterHttpReferer = "https://github.com/sdv43/pilot43"

interface OpenRouterStreamToolCallDelta {
  function?: {
    arguments?: string
    name?: string
  }
  id?: string
  index: number
}

interface OpenRouterStreamChunkDelta {
  content?: null | string
  reasoning?: null | string
  toolCalls?: OpenRouterStreamToolCallDelta[]
}

interface OpenRouterStreamChoice {
  delta: OpenRouterStreamChunkDelta
  finishReason: null | string
}

interface OpenRouterStreamResponseChunk {
  choices: OpenRouterStreamChoice[]
  error?: {
    message: string
  }
  usage?: {
    completionTokens: number
    promptTokens: number
  }
}

function toOpenRouterMessage(message: ChatMessage) {
  if (message.role === "assistant") {
    const hasToolCalls = Boolean(message.toolCalls?.length)

    return {
      ...(message.content || !hasToolCalls ? { content: message.content } : {}),
      role: "assistant" as const,
      ...(hasToolCalls
        ? {
            toolCalls: message.toolCalls?.map((toolCall) => ({
              function: {
                arguments: toolCall.arguments,
                name: toolCall.name,
              },
              id: toolCall.id,
              type: "function" as const,
            })),
          }
        : {}),
    }
  }

  if (message.role === "tool") {
    return {
      content: message.content,
      role: "tool" as const,
      toolCallId: message.toolCallId ?? message.toolName,
    }
  }

  if (message.role === "user" && message.images?.length) {
    return {
      content: [
        {
          text: message.content,
          type: "text" as const,
        },
        ...message.images.map((image) => ({
          imageUrl: {
            url: getFileAttachmentDataUrl(image),
          },
          type: "image_url" as const,
        })),
      ],
      role: "user" as const,
    }
  }

  return {
    content: message.content,
    role: message.role,
  }
}

function toOpenRouterTools(tools: CompletionConfig["tools"]) {
  return tools?.map((tool) => ({
    function: {
      description: tool.description,
      name: tool.name,
      parameters: tool.inputSchema,
    },
    type: "function" as const,
  }))
}

export class OpenRouterAdapter implements ModelAdapter {
  private client: OpenRouter
  private modelName: string

  constructor(provider: OpenRouterModelProvider, modelName: string) {
    this.client = new OpenRouter({
      apiKey: provider.settings.apiKey,
      appTitle: openRouterAppTitle,
      httpReferer: openRouterHttpReferer,
    })
    this.modelName = modelName
  }

  async *chat(
    messages: ChatMessage[],
    config?: CompletionConfig,
  ): AsyncIterable<StreamChunk> {
    const streamResponse = await this.client.chat.send(
      {
        chatRequest: {
          model: this.modelName,
          messages: messages.map((message) => toOpenRouterMessage(message)),
          stream: true,
          maxCompletionTokens: config?.maxTokens,
          parallelToolCalls: config?.tools ? true : undefined,
          temperature: config?.temperature,
          topP: config?.topP,
          ...(config?.tools ? { tools: toOpenRouterTools(config.tools) } : {}),
          ...(config?.thinking === false
            ? { reasoning: { effort: "none" as const } }
            : {}),
        },
      },
      ...(config?.signal ? [{ signal: config.signal }] : []),
    )

    if (
      typeof (streamResponse as { [Symbol.asyncIterator]?: unknown })[
        Symbol.asyncIterator
      ] !== "function"
    ) {
      throw new Error("OpenRouter did not return a streaming response")
    }

    const stream =
      streamResponse as AsyncIterable<OpenRouterStreamResponseChunk>

    const toolCallsByIndex = new Map<number, ChatToolCall>()
    let didEmitDone = false
    let finishDetected = false

    for await (const chunk of stream) {
      if (chunk.error) {
        throw new Error(chunk.error.message)
      }

      const choice = chunk.choices[0]

      if (choice) {
        choice.delta.toolCalls?.forEach((toolCallDelta) => {
          const existingToolCall = toolCallsByIndex.get(
            toolCallDelta.index,
          ) ?? {
            arguments: "",
            id: toolCallDelta.id ?? crypto.randomUUID(),
            name: "",
          }

          if (toolCallDelta.id) {
            existingToolCall.id = toolCallDelta.id
          }

          if (toolCallDelta.function?.name) {
            existingToolCall.name = toolCallDelta.function.name
          }

          if (toolCallDelta.function?.arguments) {
            existingToolCall.arguments += toolCallDelta.function.arguments
          }

          toolCallsByIndex.set(toolCallDelta.index, existingToolCall)
        })

        if (choice.finishReason !== null) {
          finishDetected = true
        }
      }

      const content = choice?.delta.content ?? ""
      const thoughts = choice?.delta.reasoning ?? ""

      if (content || thoughts) {
        yield {
          content,
          done: false,
          ...(thoughts ? { thoughts } : {}),
        }
      }

      if (chunk.usage || (finishDetected && chunk.choices.length === 0)) {
        didEmitDone = true

        yield {
          content: "",
          done: true,
          toolCalls: [...toolCallsByIndex.entries()]
            .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
            .map(([, toolCall]) => toolCall),
          ...(chunk.usage
            ? {
                usage: {
                  completionTokens: chunk.usage.completionTokens,
                  promptTokens: chunk.usage.promptTokens,
                },
              }
            : {}),
        }
      }
    }

    if (finishDetected && !didEmitDone) {
      yield {
        content: "",
        done: true,
        toolCalls: [...toolCallsByIndex.entries()]
          .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
          .map(([, toolCall]) => toolCall),
      }
    }
  }

  async listModels(): Promise<{ id: string; name: string }[]> {
    const response = await this.client.models.list()
    const models: { id: string; name: string }[] = []

    for await (const page of response) {
      models.push(
        ...page.result.data.map((model) => ({
          id: model.id,
          name: model.name,
        })),
      )
    }

    return models
  }
}
