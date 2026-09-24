import type {
  Chat,
  McpServer,
  MessageAssistant,
  MessageAssistantTool,
  MessageRun,
  MessageUserAnswer,
} from "@/shared/api"

import type { ChatMessage, ChatToolCall } from "../models"
import type { RegisteredToolDefinition } from "./types"

import { waitForMessageRunAnswer } from "../handlers/message-run-handlers/utils/await-registry"
import { getAppSettings, getChatById } from "../storage"
import {
  builtinToolDefinitions,
  listMcpResourcesToolName,
  readMcpResourceToolName,
} from "./const"
import {
  askFollowupQuestionToolName,
  executeFetchTool,
  executeGenerateFileTool,
  executeReadWebpageTool,
  executeRunJsTool,
  executeUpdateTodoListTool,
  parseAskFollowupQuestionArgs,
} from "./executors"
import { parseToolArguments, validateToolArguments } from "./executors/shared"
import {
  callMcpServerTool,
  listMcpServerResources,
  listMcpServerTools,
  mcpToolPrefix,
  parseMcpToolName,
  readMcpServerResource,
} from "./mcp-client"

/**
 * Names of the interactive tools whose execution is driven by the streaming
 * loop rather than the generic {@link executeToolCalls} executor, because they
 * need access to the message run (to persist UI state) and may need to pause
 * generation while waiting for user input.
 */
const interactiveToolNames = new Set<string>([askFollowupQuestionToolName])
const mcpResourceToolNames = new Set<string>([
  listMcpResourcesToolName,
  readMcpResourceToolName,
])

export function isInteractiveTool(name: string): boolean {
  return interactiveToolNames.has(name)
}

/**
 * Returns the synthetic chat-settings tool key that tracks whether an MCP
 * server is enabled in a chat (`mcp__<serverName>`).
 */
function buildMcpServerKey(serverName: string): string {
  return `${mcpToolPrefix}${serverName}`
}

function getEnabledBuiltinTools(chat: Chat): RegisteredToolDefinition[] {
  if (chat.settings.tools.length === 0) {
    return builtinToolDefinitions.filter(
      (tool) =>
        tool.definition.hidden ?? tool.definition.defaultEnabled ?? true,
    )
  }

  const enabledByToolName = new Map(
    chat.settings.tools.map((tool) => [tool.name, tool.enabled]),
  )

  return builtinToolDefinitions.filter((tool) => {
    if (tool.definition.hidden) {
      return true
    }

    const override = enabledByToolName.get(tool.definition.name)

    if (override !== undefined) {
      return override
    }

    return tool.definition.defaultEnabled ?? true
  })
}

/**
 * Resolves the set of MCP servers that are enabled for the given chat. A
 * server is enabled when its synthetic toggle entry (`mcp__<serverName>`) is
 * present and set to `true` in the chat settings.
 */
function getEnabledMcpServers(chat: Chat, servers: McpServer[]) {
  const enabledByName = new Map<string, boolean>()

  for (const entry of chat.settings.tools) {
    if (entry.name.startsWith(mcpToolPrefix)) {
      enabledByName.set(entry.name, entry.enabled)
    }
  }

  return servers.filter(
    (server) => enabledByName.get(buildMcpServerKey(server.name)) === true,
  )
}

/**
 * Asynchronously resolves the full set of enabled tool definitions for a chat,
 * including MCP server tools. For each enabled MCP server, connects over the
 * streamable-HTTP transport and lists its tools. Servers that fail to connect
 * are skipped (their tools are simply unavailable for that run); the per-tool
 * error is surfaced to the model only if it later tries to call one of them,
 * which it cannot because the tool is not advertised.
 *
 * Returns the built-in enabled tools plus the resolved MCP tools.
 */
export async function getEnabledTools(
  chat: Chat,
): Promise<RegisteredToolDefinition[]> {
  const settings = await getAppSettings()
  const mcpServers = settings.mcpServers ?? []
  const enabledServers = getEnabledMcpServers(chat, mcpServers)
  const builtin = getEnabledBuiltinTools(chat).filter(
    (tool) =>
      enabledServers.length > 0 ||
      !mcpResourceToolNames.has(tool.definition.name),
  )

  if (enabledServers.length === 0) {
    return builtin
  }

  // Resolve each enabled server's tools in parallel. Failures are swallowed so
  // one broken server doesn't prevent the others (or the built-in tools) from
  // being advertised to the model.
  const enabledByToolName = new Map(
    chat.settings.tools.map((tool) => [tool.name, tool.enabled]),
  )

  const results = await Promise.allSettled(
    enabledServers.map((server) => listMcpServerTools(server)),
  )

  const mcpTools: RegisteredToolDefinition[] = []

  for (const result of results) {
    if (result.status !== "fulfilled") {
      continue
    }

    for (const tool of result.value) {
      const serverEnabled =
        enabledByToolName.get(buildMcpServerKey(tool.serverName)) === true
      const override = enabledByToolName.get(tool.definition.name)

      // An enabled MCP server exposes all of its tools by default; an explicit
      // per-tool `false` override can still disable a specific MCP tool.
      if (serverEnabled && override !== false) {
        mcpTools.push({
          definition: tool.definition,
          inputSchema: tool.inputSchema,
          group: tool.serverName,
        })
      }
    }
  }

  return [...builtin, ...mcpTools]
}

/**
 * Builds a tool result entry for an interactive tool without executing it. The
 * streaming loop uses this so the persisted assistant message records the
 * tool call and a lightweight result, while the actual interaction (rendering
 * the follow-up question or todo list, awaiting the user's answer) is handled
 * by the loop itself.
 */
function buildInteractiveToolResult(
  toolCall: ChatToolCall,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
): MessageAssistantTool {
  return {
    // Guarantee a stable id so the reconstructed conversation history can match
    // the assistant tool call to its tool result message even when a provider
    // omits the tool call id.
    id: toolCall.id || `${toolCall.name}-${crypto.randomUUID()}`,
    args,
    name: toolCall.name,
    result,
  }
}

/**
 * Executes a single non-interactive tool call, returning a persisted tool
 * result entry. Validation and execution errors are captured per-tool so one
 * failure never aborts the whole batch.
 */
async function executeSingleToolCall(
  toolCall: ChatToolCall,
  enabledToolByName: Map<string, RegisteredToolDefinition>,
  chatId: Chat["id"],
): Promise<MessageAssistantTool> {
  let args: null | Record<string, unknown> = null

  try {
    const toolDefinition = enabledToolByName.get(toolCall.name)
    if (!toolDefinition) {
      throw new Error(`Tool \`${toolCall.name}\` is not enabled.`)
    }

    args = parseToolArguments(toolCall.arguments)

    // MCP tools use arbitrary JSON Schemas (which can include `integer`,
    // `array`, `null`, and union types) that the built-in strict validator
    // doesn't cover. The MCP server validates arguments itself, so we skip the
    // local schema check for namespaced MCP tools.
    if (!parseMcpToolName(toolDefinition.definition.name)) {
      validateToolArguments(toolDefinition.inputSchema, args)
    }

    // Interactive tools are handled by the streaming loop, which needs access
    // to the message run and may pause generation. Skip them here.
    if (isInteractiveTool(toolDefinition.definition.name)) {
      return {
        id: toolCall.id,
        args,
        name: toolCall.name,
        result: { ok: true, skipped: true },
      }
    }

    const result = await executeTool(
      toolDefinition.definition.name,
      args,
      chatId,
    )

    return {
      id: toolCall.id,
      args,
      name: toolCall.name,
      result,
    }
  } catch (error) {
    return {
      id: toolCall.id,
      args,
      name: toolCall.name,
      result: {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
      },
    }
  }
}

/**
 * Dispatches a validated tool call to its executor by name.
 */
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  chatId: Chat["id"],
): Promise<Record<string, unknown>> {
  if (name === "fetch") {
    return await executeFetchTool(args)
  }

  if (name === "generate_file") {
    return await executeGenerateFileTool(args, chatId)
  }

  if (name === listMcpResourcesToolName) {
    return await executeListMcpResourcesTool(args, chatId)
  }

  if (name === readMcpResourceToolName) {
    return await executeReadMcpResourceTool(args, chatId)
  }

  if (name === "read_webpage") {
    return await executeReadWebpageTool(args)
  }

  if (name === "run_js") {
    return await executeRunJsTool(args)
  }

  if (name === "update_todo_list") {
    return await executeUpdateTodoListTool(args, chatId)
  }

  const mcpTool = parseMcpToolName(name)

  if (mcpTool) {
    return await executeMcpTool(mcpTool.serverName, mcpTool.toolName, args)
  }

  throw new Error(`Tool \`${name}\` is not implemented.`)
}

/**
 * Executes an MCP tool call by looking up the server configuration in app
 * settings and forwarding the call over the streamable-HTTP transport.
 */
async function executeMcpTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const settings = await getAppSettings()
  const server = (settings.mcpServers ?? []).find(
    (entry) => entry.name === serverName,
  )
  if (!server) {
    throw new Error(`MCP server \`${serverName}\` is not configured.`)
  }

  return await callMcpServerTool(server, toolName, args)
}

async function getMcpServerRuntimeState(chatId: Chat["id"]): Promise<{
  enabledByName: Map<string, McpServer>
  enabledServers: McpServer[]
}> {
  const chat = await getChatById(chatId)

  if (!chat) {
    throw new Error(`Chat \`${chatId}\` not found.`)
  }

  const settings = await getAppSettings()
  const enabledServers = getEnabledMcpServers(chat, settings.mcpServers ?? [])

  return {
    enabledByName: new Map(
      enabledServers.map((server) => [server.name, server]),
    ),
    enabledServers,
  }
}

async function executeListMcpResourcesTool(
  args: Record<string, unknown>,
  chatId: Chat["id"],
): Promise<Record<string, unknown>> {
  const requestedServerName =
    typeof args.server === "string" && args.server.trim()
      ? args.server.trim()
      : undefined
  const { enabledByName, enabledServers } =
    await getMcpServerRuntimeState(chatId)

  if (enabledServers.length === 0) {
    return {
      error: "No MCP servers are enabled for this chat.",
      ok: false,
    }
  }

  const servers = requestedServerName
    ? [enabledByName.get(requestedServerName)].filter(
        (server): server is McpServer => server !== undefined,
      )
    : enabledServers

  if (servers.length === 0) {
    return {
      error: `MCP server \`${requestedServerName}\` is not enabled for this chat.`,
      ok: false,
    }
  }

  const results = await Promise.allSettled(
    servers.map(async (server) => ({
      resources: await listMcpServerResources(server),
      serverName: server.name,
    })),
  )

  const errors: Array<{ error: string; server: string }> = []
  const resources: unknown[] = []

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index]
    const serverName = servers[index]?.name ?? requestedServerName ?? "unknown"

    if (result.status === "rejected") {
      errors.push({
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        server: serverName,
      })
      continue
    }

    resources.push(...result.value.resources)
  }

  if (resources.length === 0 && errors.length > 0) {
    return {
      error:
        requestedServerName !== undefined
          ? `Failed to list resources for MCP server \`${requestedServerName}\`.`
          : "Failed to list resources from the enabled MCP servers.",
      errors,
      ok: false,
    }
  }

  return {
    ...(errors.length > 0 ? { errors, partial: true } : {}),
    ok: true,
    resources,
  }
}

async function executeReadMcpResourceTool(
  args: Record<string, unknown>,
  chatId: Chat["id"],
): Promise<Record<string, unknown>> {
  const serverName =
    typeof args.server === "string" && args.server.trim()
      ? args.server.trim()
      : null
  const uri =
    typeof args.uri === "string" && args.uri.trim() ? args.uri.trim() : null

  if (!serverName) {
    return {
      error: "Parameter `server` must be a non-empty string.",
      ok: false,
    }
  }

  if (!uri) {
    return {
      error: "Parameter `uri` must be a non-empty string.",
      ok: false,
    }
  }

  const { enabledByName } = await getMcpServerRuntimeState(chatId)
  const server = enabledByName.get(serverName)

  if (!server) {
    return {
      error: `MCP server \`${serverName}\` is not enabled for this chat.`,
      ok: false,
    }
  }

  return await readMcpServerResource(server, uri)
}

export async function executeToolCalls(
  toolCalls: ChatToolCall[],
  enabledTools: RegisteredToolDefinition[],
  chatId: Chat["id"],
): Promise<MessageAssistantTool[]> {
  const enabledToolByName = new Map(
    enabledTools.map((tool) => [tool.definition.name, tool]),
  )

  const otherResults = Promise.all(
    toolCalls.map((toolCall) =>
      executeSingleToolCall(toolCall, enabledToolByName, chatId),
    ),
  )

  // Reassemble results in the original tool-call order so the persisted
  // assistant message keeps a stable, predictable ordering.
  const resultsByCallId = new Map<string, MessageAssistantTool>()

  for (const result of await otherResults) {
    resultsByCallId.set(result.id ?? "", result)
  }

  return toolCalls
    .map((toolCall) => resultsByCallId.get(toolCall.id ?? ""))
    .filter((result): result is MessageAssistantTool => result !== undefined)
}

/**
 * Processes interactive tool calls (`ask_followup_question` and
 * `update_todo_list`). Records tool result entries on the assistant message so
 * the conversation history reflects the call, persists any UI state, and —
 * when a follow-up question is present — pauses generation until the user
 * answers. Because {@link generateResponse} is fire-and-forget, awaiting the
 * answer promise here pauses the loop in place and resumes it automatically
 * once the sidepanel submits an answer.
 *
 * The user's answer is persisted as a {@link MessageUserAnswer} inside the
 * run's `assistantMessages` so it survives in history and is rendered as a
 * user bubble, and is also appended to the live conversation context.
 */
export async function executeInteractiveToolCalls(
  interactiveCalls: ChatToolCall[],
  assistantMessage: MessageAssistant,
  messageRun: MessageRun,
  chatId: Chat["id"],
  signal: AbortSignal,
  persistMessageRunUpdate: (
    chatId: Chat["id"],
    messageRun: MessageRun,
  ) => Promise<void>,
): Promise<{
  conversationMessages: ChatMessage[]
  shouldStop: boolean
}> {
  const conversationMessages: ChatMessage[] = []

  for (const toolCall of interactiveCalls) {
    let args: Record<string, unknown> = {}

    try {
      args = parseToolArguments(toolCall.arguments)

      if (toolCall.name === askFollowupQuestionToolName) {
        const { followUp, question } = parseAskFollowupQuestionArgs(args)

        messageRun.followupQuestion = { followUp, question }
        messageRun.status = "awaiting_input"

        assistantMessage.tools.push(
          buildInteractiveToolResult(toolCall, args, {
            awaitingInput: true,
            ok: true,
            question,
          }),
        )

        await persistMessageRunUpdate(chatId, messageRun)

        // The assistant message itself is appended once by the outer loop after
        // the tool round finishes, while the user's answer is appended below.

        // Pause generation until the user answers.
        let answer: string

        try {
          answer = await waitForMessageRunAnswer(messageRun.id)
        } catch {
          // The run was stopped while waiting for an answer.
          messageRun.followupQuestion = null
          return {
            conversationMessages,
            shouldStop: true,
          }
        }

        if (signal.aborted) {
          return {
            conversationMessages,
            shouldStop: true,
          }
        }

        // Persist the answer as a user-answer entry inside the run so it stays
        // in the saved history and is shown as a (gray) user bubble.
        const userAnswer: MessageUserAnswer = {
          id: crypto.randomUUID(),
          content: answer,
          createdAt: Date.now(),
          messageRunId: messageRun.id,
          role: "user_answer",
        }
        messageRun.assistantMessages.push(userAnswer)

        // Clear the pending question and resume. The answer is also appended to
        // the live conversation context so the model sees it on the next turn.
        messageRun.followupQuestion = null
        messageRun.status = "running"

        conversationMessages.push({ content: answer, role: "user" })

        await persistMessageRunUpdate(chatId, messageRun)
      } else {
        assistantMessage.tools.push(
          buildInteractiveToolResult(toolCall, args, {
            error: `Tool \`${toolCall.name}\` is not implemented.`,
            ok: false,
          }),
        )
      }
    } catch (error) {
      assistantMessage.tools.push(
        buildInteractiveToolResult(toolCall, args, {
          error: error instanceof Error ? error.message : String(error),
          ok: false,
        }),
      )
    }
  }

  return {
    conversationMessages,
    shouldStop: false,
  }
}
