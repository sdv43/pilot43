import OpenAI from "openai"

import type { OpenAIModelProvider } from "@/shared/api"

import { getFileAttachmentDataUrl } from "@/shared/message-content"

import type {
  ChatMessage,
  ChatToolCall,
  CompletionConfig,
  ModelAdapter,
  StreamChunk,
} from "./types"

function toOpenAIMessage(message: ChatMessage) {
  if (message.role === "assistant") {
    const hasToolCalls = Boolean(message.toolCalls?.length)

    return {
      ...(message.content || !hasToolCalls ? { content: message.content } : {}),
      role: "assistant" as const,
      ...(hasToolCalls
        ? {
            tool_calls: message.toolCalls?.map((toolCall) => ({
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
      tool_call_id: message.toolCallId ?? message.toolName,
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
          image_url: {
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

function toOpenAITools(tools: CompletionConfig["tools"]) {
  return tools?.map((tool) => ({
    function: {
      description: tool.description,
      name: tool.name,
      parameters: tool.inputSchema,
    },
    type: "function" as const,
  }))
}

export class OpenAIAdapter implements ModelAdapter {
  private client: OpenAI
  private modelName: string

  constructor(provider: OpenAIModelProvider, modelName: string) {
    this.client = new OpenAI({
      apiKey: provider.settings.apiKey,
      baseURL: provider.settings.host,
      dangerouslyAllowBrowser: true,
    })
    this.modelName = modelName
  }

  async *chat(
    messages: ChatMessage[],
    config?: CompletionConfig,
  ): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.modelName,
        messages: messages.map((message) => toOpenAIMessage(message)),
        stream: true,
        stream_options: { include_usage: true },
        temperature: config?.temperature,
        max_tokens: config?.maxTokens,
        top_p: config?.topP,
        ...(config?.tools ? { tools: toOpenAITools(config.tools) } : {}),
      },
      ...(config?.signal ? [{ signal: config.signal }] : []),
    )
    const toolCallsByIndex = new Map<number, ChatToolCall>()
    let didEmitDone = false
    let finishDetected = false

    for await (const chunk of stream) {
      // when the model is thinking it will send a chunk with choice.delta.reasoning
      const choice = chunk.choices[0] as (typeof chunk.choices)[number] & {
        delta: {
          reasoning?: string
        }
      }

      if (choice) {
        choice.delta.tool_calls?.forEach((toolCallDelta) => {
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

        if (choice.finish_reason !== null) {
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
                  completionTokens: chunk.usage.completion_tokens,
                  promptTokens: chunk.usage.prompt_tokens,
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
    return (response.data ?? []).map((model) => ({
      id: model.id,
      name: model.id,
    }))
  }
}
