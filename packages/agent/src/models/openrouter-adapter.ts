import type {
  ModelReasoningCapability,
  OpenRouterModelProvider,
} from "@pilot43/protocol"

import { OpenRouter } from "@openrouter/sdk"
import { getFileAttachmentDataUrl } from "@pilot43/protocol"

import type {
  ChatMessage,
  ChatToolCall,
  CompletionConfig,
  FinishReason,
  ModelAdapter,
  StreamChunk,
} from "./types"

import { toFinishReason } from "./types"

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
  reasoningDetails?: OpenRouterReasoningDetail[]
  toolCalls?: OpenRouterStreamToolCallDelta[]
}

/**
 * A `reasoning_details` block (`reasoning.text`, `reasoning.summary`,
 * `reasoning.encrypted`, …). Kept opaque apart from the fields used to merge
 * streamed pieces.
 */
type OpenRouterReasoningDetail = Record<string, unknown> & {
  index?: number
  type?: string
}

/** Text fields of a reasoning block that stream in pieces. */
const reasoningDetailTextFields = ["text", "summary", "data"] as const

/**
 * Adds a streamed `reasoning_details` piece to the blocks collected so far.
 * Pieces of one block share its `index` (and type): their text is
 * concatenated and other fields (e.g. the `signature` sent last) are kept.
 */
export function mergeReasoningDetail(
  details: OpenRouterReasoningDetail[],
  piece: OpenRouterReasoningDetail,
) {
  const existing =
    piece.index === undefined
      ? undefined
      : details.find(
          (detail) =>
            detail.index === piece.index && detail.type === piece.type,
        )

  if (!existing) {
    details.push({ ...piece })
    return
  }

  for (const [key, value] of Object.entries(piece)) {
    if (value === null || value === undefined) {
      continue
    }

    const current = existing[key]

    existing[key] =
      reasoningDetailTextFields.includes(
        key as (typeof reasoningDetailTextFields)[number],
      ) &&
      typeof current === "string" &&
      typeof value === "string"
        ? current + value
        : value
  }
}

/**
 * Models served through Anthropic, which cache only from explicit
 * breakpoints. Other providers on OpenRouter cache prompts on their own.
 */
function needsCacheBreakpoints(modelName: string) {
  return modelName.startsWith("anthropic/")
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

function toModelReasoningCapability(
  reasoning:
    | undefined
    | {
        defaultEffort?: null | string
        mandatory: boolean
        supportedEfforts?: Array<null | string> | null
      },
): ModelReasoningCapability | undefined {
  if (!reasoning) {
    return undefined
  }

  return {
    mandatory: reasoning.mandatory,
    ...(typeof reasoning.defaultEffort === "string"
      ? { defaultEffort: reasoning.defaultEffort }
      : {}),
    ...(reasoning.supportedEfforts
      ? {
          supportedEfforts: reasoning.supportedEfforts.filter(
            (effort): effort is string => typeof effort === "string",
          ),
        }
      : { supportedEfforts: reasoning.supportedEfforts ?? null }),
  }
}

function toOpenRouterMessage(message: ChatMessage, cacheSystemPrompt = false) {
  if (message.role === "system" && cacheSystemPrompt) {
    return {
      content: [
        {
          cacheControl: { type: "ephemeral" as const },
          text: message.content,
          type: "text" as const,
        },
      ],
      role: "system" as const,
    }
  }

  if (message.role === "assistant") {
    const hasToolCalls = Boolean(message.toolCalls?.length)
    const reasoningDetails = message.reasoning?.details

    return {
      ...(message.content || !hasToolCalls ? { content: message.content } : {}),
      ...(reasoningDetails?.length
        ? { reasoningDetails: reasoningDetails as never[] }
        : {}),
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
    const reasoningEffort =
      config?.reasoningEffort ??
      (config?.thinking === false ? "none" : undefined)

    const cacheBreakpoints = needsCacheBreakpoints(this.modelName)

    const chatRequest = {
      model: this.modelName,
      messages: messages.map((message) =>
        // The system message (with the tool instructions) is the same in
        // every request of a chat; the top-level `cacheControl` below adds a
        // breakpoint on the last message for the growing conversation.
        toOpenRouterMessage(message, cacheBreakpoints),
      ),
      stream: true,
      ...(cacheBreakpoints
        ? { cacheControl: { type: "ephemeral" as const } }
        : {}),
      // Keeps a chat on the same upstream provider so its prompt cache hits.
      ...(config?.sessionId ? { sessionId: config.sessionId } : {}),
      maxCompletionTokens: config?.maxTokens,
      parallelToolCalls: config?.tools ? true : undefined,
      temperature: config?.temperature,
      topP: config?.topP,
      ...(reasoningEffort !== undefined
        ? { reasoningEffort: reasoningEffort as never }
        : {}),
      ...(config?.tools ? { tools: toOpenRouterTools(config.tools) } : {}),
    } satisfies Parameters<typeof this.client.chat.send>[0]["chatRequest"]

    const streamResponse = await this.client.chat.send(
      {
        chatRequest,
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
    const reasoningDetails: OpenRouterReasoningDetail[] = []
    let didEmitDone = false
    let finishDetected = false
    let finishReason: FinishReason | undefined

    const getDoneExtras = () => ({
      ...(finishReason ? { finishReason } : {}),
      ...(reasoningDetails.length > 0
        ? { reasoningDetails: structuredClone(reasoningDetails) }
        : {}),
      toolCalls: [...toolCallsByIndex.entries()]
        .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
        .map(([, toolCall]) => toolCall),
    })

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

        choice.delta.reasoningDetails?.forEach((piece) => {
          mergeReasoningDetail(reasoningDetails, piece)
        })

        if (choice.finishReason !== null) {
          finishDetected = true
          finishReason = toFinishReason(choice.finishReason)
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
          ...getDoneExtras(),
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
        ...getDoneExtras(),
      }
    }
  }

  async listModels(): Promise<
    {
      contextWindow?: number
      id: string
      name: string
      reasoning?: ModelReasoningCapability
    }[]
  > {
    const response = await this.client.models.list()
    const models: {
      contextWindow?: number
      id: string
      name: string
      reasoning?: ModelReasoningCapability
    }[] = []

    for await (const page of response) {
      models.push(
        ...page.result.data.map((model) => ({
          id: model.id,
          name: model.name,
          reasoning: toModelReasoningCapability(model.reasoning),
          ...(model.contextLength
            ? { contextWindow: model.contextLength }
            : {}),
        })),
      )
    }

    return models
  }
}
