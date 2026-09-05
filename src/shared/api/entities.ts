import type { Readability } from "@mozilla/readability"

export interface EntityBase {
  id: string
}

export interface Workspace extends EntityBase {
  name: string
  lastSelectedChatId: Chat["id"] | null
}

export interface Chat extends EntityBase {
  workspaceId: Workspace["id"]
  title: string
  settings: ChatSettings
  createdAt?: number
  updatedAt?: number
  /**
   * Markdown checklist tracking the model's step-by-step progress, set whenever
   * the model calls `update_todo_list`. Bound to the chat (not a single message
   * run) so it is passed to the model as context on every turn and stays
   * visible while it is set. Cleared implicitly when the model sends an empty
   * checklist.
   */
  todoList?: null | string
}

export interface ChatSettings {
  pinned?: boolean
  tools: { name: string; enabled: boolean }[]
}

export interface MessageRun extends EntityBase {
  chatId: Chat["id"]
  userMessage: MessageUser
  /**
   * Ordered list of assistant responses for this run, interleaved with any
   * user answers to follow-up questions. A {@link MessageUserAnswer} entry is
   * appended when the user answers an `ask_followup_question` call so the
   * answer is persisted in the history and shown as a (gray) user bubble.
   */
  assistantMessages: (MessageAssistant | MessageUserAnswer)[]
  status:
    | "awaiting_input"
    | "completed"
    | "failed"
    | "pending"
    | "running"
    | "stopped"
  error: null | string
  createdAt: number
  updatedAt: number
  modelMeta: {
    name: string
    provider: ModelProvider["id"]
    settings: object
  }
  /**
   * Set when the model called `ask_followup_question` and is waiting for the
   * user to answer before generation can continue.
   */
  followupQuestion?: FollowupQuestion | null
  /**
   * Set when the model has reached the tool round-trip limit and is waiting
   * for the user to confirm whether generation should continue. While set the
   * run status is `"awaiting_input"`.
   */
  continuationPrompt?: ContinuationPrompt | null
}

export interface FollowupQuestion {
  question: string
  followUp: FollowupQuestionSuggestion[]
}

export interface FollowupQuestionSuggestion {
  text: string
}

/**
 * A confirmation prompt shown when the assistant has been working autonomously
 * (calling tools) for too many round trips and the user is asked whether to
 * let it continue or stop.
 */
export interface ContinuationPrompt {
  message: string
}

/**
 * A text file produced by the model via the `generate_file` tool. The content
 * lives in this entity (persisted in its own IndexedDB store) while the tool
 * result stored on the assistant message only keeps the file id and metadata,
 * so large files never bloat the conversation history sent back to the model.
 */
export interface GeneratedFile extends EntityBase {
  chatId: Chat["id"]
  filename: string
  mimeType: string
  content: string
  size: number
  createdAt: number
  updatedAt: number
}

export interface MessageBase extends EntityBase {
  messageRunId: MessageRun["id"]
  content: string
  createdAt: number
  tokenCount?: number
}

export interface MessageAssistantTool {
  id?: string
  name: string
  args: null | Record<string, unknown>
  result: null | Record<string, unknown>
}

export interface MessageAssistant extends MessageBase {
  role: "assistant"
  thoughts?: string
  createdAt: number
  tools: MessageAssistantTool[]
}

/**
 * A persisted user answer to a follow-up question. Stored inside a run's
 * `assistantMessages` so the conversation history stays ordered, but rendered
 * as a user message bubble (in a muted color to distinguish it from the
 * primary user request).
 */
export interface MessageUserAnswer extends MessageBase {
  role: "user_answer"
}

export interface MessageUserAttachmentReference {
  attachmentIndex: number
  end: number
  id: string
  start: number
}

export interface MessageUserCommandReference {
  command: string
  id: string
  start: number
  end: number
}

export interface MessageUser extends MessageBase {
  role: "user"
  attachmentReferences?: MessageUserAttachmentReference[]
  commandReference?: MessageUserCommandReference
  attachments: (
    FileAttachment | PageContentAttachment | PageContentSelectionAttachment
  )[]
}

export interface FileAttachment {
  type: "file"
  mediaType: string
  name: string
  content: string
  size: number
}

export interface ModelProvider<T = unknown, S = unknown> extends EntityBase {
  name: string
  type: T
  settings: S
  /**
   * Maximum number of requests the provider is allowed to process per minute.
   * Defaults to {@link defaultMaxRequestPerMinute} when omitted.
   */
  maxRequestPerMinute?: number
}

export interface OpenAIModelProvider extends ModelProvider<
  "openai",
  { apiKey: string; host?: string }
> {}

export interface OpenRouterModelProvider extends ModelProvider<
  "openrouter",
  { apiKey: string }
> {}

export interface OllamaModelProvider extends ModelProvider<
  "ollama",
  { host: string }
> {}

export interface ModelProviderModel extends EntityBase {
  name: string
  providerId: ModelProvider["id"]
}

export type PageContent = ReturnType<Readability["parse"]> & {
  // Chrome tab id
  id: number
  url: string
}

export interface PageContentSelection {
  // Chrome tab id
  id: number
  // Unique key for the selection
  uniqueKey: string
  url: string
  title: string
  description: string
  content: string
}

export type PageContentAttachment = PageContent & {
  type: "page-content"
}

export interface PageContentSelectionAttachment extends PageContentSelection {
  type: "page-content-selection"
}

export interface ModelTool extends EntityBase {
  name: string
  /**
   * Detailed, model-facing description of the tool: what it does, when to use
   * it, and how its arguments behave. Sent to the model as the function
   * description. Keep under ~1000 characters.
   */
  description: string
  /**
   * Optional short, single-line label (max ~70 characters) shown in the tools
   * settings UI instead of the verbose {@link description}. Falls back to
   * {@link description} when omitted.
   */
  shortDescription?: string
  /**
   * Optional grouping key used by the tools UI to render related tools under a
   * collapsible group (e.g. `"github"`). Tools without a group are rendered as
   * standalone items.
   */
  group?: string
  /**
   * Whether the tool is enabled for new chats before the user has toggled it.
   * When omitted the historical default of `true` is used.
   */
  defaultEnabled?: boolean
  /**
   * When `true`, the tool is always enabled and hidden from the per-chat tools
   * settings UI. Used for system/interactive tools (e.g.
   * `ask_followup_question`, `update_todo_list`) that the user cannot disable.
   */
  hidden?: boolean
}

/**
 * A slash command (`/<name>`) that expands into a prompt when the user message
 * is sent to the model. Slash commands may only appear at the very start of a
 * message and are replaced by their {@link Command.prompt} text while building
 * the conversation history.
 *
 * Built-in commands ship with the extension and cannot be edited or deleted by
 * the user; user commands are created from the settings dialog.
 */
export interface Command extends EntityBase {
  name: string
  prompt: string
  /** Whether the command ships with the extension and is read-only for users. */
  builtin: boolean
  description?: string
}

/**
 * Identifiers used to control which model generates chat titles.
 *
 * - {@link TITLE_GENERATION_DISABLED}: do not generate titles automatically.
 * - {@link TITLE_GENERATION_USE_CHAT_MODEL}: use the same model that is
 *   replying to the user message.
 * - Any other string is a model id in the `providerId::modelName` format
 *   (see {@link getModelProviderModelId}) selecting a specific model.
 */
export type TitleGenerationModel = string

/** Do not generate chat titles automatically. */
export const TITLE_GENERATION_DISABLED = "disabled"

/** Use the model replying to the user message to generate chat titles. */
export const TITLE_GENERATION_USE_CHAT_MODEL = "use-chat-model"

/**
 * A user-configured Model Context Protocol (MCP) server. Only the HTTP
 * transport is supported because the extension runs in a browser context.
 *
 * Servers are stored as a list inside {@link AppSettings} and identified by
 * their {@link McpServer.name}, which must be unique. The {@link name} is also
 * used as the grouping key in the tools UI and as a prefix when an MCP tool is
 * exposed to the model.
 */
export interface McpServer {
  /**
   * Unique, user-facing server name. Used as the tools-UI group key and to
   * namespace the server's tools (e.g. `mcp__<name>__<tool>`).
   */
  name: string
  /**
   * Transport type. Only `"http"` is supported because the extension runs in a
   * browser context.
   */
  type: "http"
  /**
   * Absolute http(s) URL of the MCP server's streamable-HTTP endpoint.
   */
  url: string
  /**
   * Optional HTTP headers (e.g. `Authorization`) sent with every request to
   * the server. Values must be strings.
   */
  headers?: Record<string, string>
  /**
   * Additional JSON-serializable transport configuration preserved from the
   * settings editor. Known fields are normalized; unknown fields are stored as
   * provided so compatible transports can consume them later.
   */
  [key: string]: unknown
}

/**
 * Extension-wide settings stored in the `appSettings` IndexedDB store under a
 * single fixed key (see {@link APP_SETTINGS_KEY}).
 */
export interface AppSettings {
  /**
   * Fixed key used for the single app-settings record.
   */
  id: "app"
  /**
   * Controls which model (if any) is used to generate chat titles. Defaults to
   * {@link TITLE_GENERATION_DISABLED}.
   */
  titleGenerationModel: TitleGenerationModel
  /**
   * User-configured MCP servers. Defaults to an empty list. The available
   * tools for every configured server are loaded eagerly (regardless of
   * whether the server is enabled in a chat) so the tools UI can render them
   * immediately. A server is enabled per-chat by toggling its group checkbox,
   * which enables all of its tools at once.
   */
  mcpServers?: McpServer[]
}
