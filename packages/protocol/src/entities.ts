export interface EntityBase {
  id: string
}

export interface Workspace extends EntityBase {
  name: string
  lastSelectedChatId: Chat["id"] | null
  /**
   * Avatar colour, one of {@link workspaceColors}. Workspaces created before
   * colours existed have none and use the first colour.
   */
  color?: WorkspaceColor
  /**
   * Extra instructions appended to the system prompt of every chat in the
   * workspace.
   */
  systemPrompt?: string
  /**
   * Names of the MCP servers chats in this workspace may use. `undefined`
   * allows every configured server (workspaces created before the setting
   * existed).
   */
  mcpServers?: string[]
  /** Which tools run without asking. Missing entries use the defaults. */
  toolPermissions?: WorkspaceToolPermissions
}

/**
 * `allow` runs a tool straight away; `ask` pauses the chat until the user
 * approves the call.
 */
export type ToolPermission = "allow" | "ask"

/** Permission of a group of tools with optional per-tool overrides. */
export interface ToolPermissionGroup {
  level: ToolPermission
  /** Per-tool overrides keyed by tool name, reset when `level` changes. */
  tools?: Record<string, ToolPermission>
}

/**
 * Tool permissions of a workspace: one group for the built-in tools and one
 * per MCP server (keyed by server name). They are a hard limit: a chat cannot
 * run a tool with fewer checks than its workspace allows.
 */
export interface WorkspaceToolPermissions {
  builtin?: ToolPermissionGroup
  mcp?: Record<string, ToolPermissionGroup>
}

/** Maximum length of {@link Workspace.systemPrompt}. */
export const workspaceSystemPromptMaxLength = 4000

/** Colours a workspace avatar can use, in the order the picker shows them. */
export const workspaceColors = [
  "violet",
  "blue",
  "green",
  "orange",
  "red",
  "gray",
] as const

export type WorkspaceColor = (typeof workspaceColors)[number]

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
  /**
   * Short plain-text excerpt of the latest assistant reply, shown under the
   * title in the chat history.
   */
  preview?: string
  /** `true` while a message run of this chat is generating a response. */
  isGenerating?: boolean
}

export interface ChatSettings {
  pinned?: boolean
  tools: { name: string; enabled: boolean }[]
  /**
   * Model last selected in the chat. A chat keeps it (even if a later
   * message used another model) and new chats start with the model of the
   * workspace's most recently active chat.
   */
  model?: ChatModelSelection
}

export interface ChatModelSelection {
  name: ModelProviderModel["name"]
  providerId: ModelProvider["id"]
  settings?: ModelRunSettings
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
    settings: ModelRunSettings
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
  /**
   * Set while a tool call waits for the user's approval because its
   * workspace permission is "Always ask". While set the run status is
   * `"awaiting_input"`; answer with one of {@link toolApprovalAnswers}.
   */
  toolApproval?: null | ToolApprovalRequest
  /** When generation started (again, after a retry). */
  startedAt?: number
  /** When the run finished (completed, failed or stopped). */
  completedAt?: number
}

/** A tool call paused until the user allows or denies it. */
export interface ToolApprovalRequest {
  /** {@link MessageAssistantTool.id} of the waiting call. */
  toolCallId: string
  toolName: string
  /** MCP server of the tool, absent for built-in tools. */
  server?: string
}

/**
 * Questions the model asks with `ask_followup_question`. The form shows one
 * question per step; `questions` is absent on questions saved by older
 * versions, which only have `question` and `followUp` suggestions.
 */
export interface FollowupQuestion {
  /** First question's text, kept for older clients and history. */
  question: string
  /** Suggested answers of the first question (older format). */
  followUp: FollowupQuestionSuggestion[]
  questions?: FollowupQuestionItem[]
}

export interface FollowupQuestionSuggestion {
  text: string
}

export interface FollowupQuestionItem {
  /** Short step label, e.g. "Branch". */
  header: string
  question: string
  /** `true` lets the user pick several options. */
  multiple: boolean
  options: FollowupQuestionOption[]
}

export interface FollowupQuestionOption {
  label: string
  description?: string
  /** The model's suggested pick. */
  recommended?: boolean
}

/** The user's answer to one {@link FollowupQuestionItem}. */
export interface FollowupAnswer {
  header: string
  question: string
  /** Chosen option labels; empty when only free text was given. */
  selected: string[]
  /** Free-text answer ("Other" or "Anything else?"). */
  text?: string
  /** `true` when the user skipped the question. */
  skipped?: boolean
}

/**
 * A notice that pauses a run until the user chooses to continue:
 *
 * - `tool_limit`: the assistant made many tool calls in a row; Continue lets it
 *   keep going, Stop ends the turn.
 * - `rate_limit`: the provider rejected a request with HTTP 429; Continue
 *   retries the request.
 */
export interface ContinuationPrompt {
  /** Defaults to `tool_limit` for prompts saved before kinds existed. */
  kind?: "rate_limit" | "tool_limit"
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
  /**
   * Lifecycle of the call. Missing on calls saved by older versions, which
   * are recorded only once finished.
   */
  status?: "awaiting_approval" | "completed" | "denied" | "failed" | "running"
  startedAt?: number
  /** Execution time, excluding the time spent waiting for approval. */
  durationMs?: number
  /** How the call was allowed to run. */
  approval?: "allowed" | "approved" | "asked"
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
  /** Structured answers when the user used the question form. */
  answers?: FollowupAnswer[]
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
   * Per-model settings keyed by provider-local model name. Used for providers
   * that do not report reasoning support (OpenAI-compatible APIs), where the
   * user enters the levels a model accepts.
   */
  models?: Record<string, ModelProviderModelSettings>
}

export interface ModelProviderModelSettings {
  reasoning?: {
    /** Default level; must be one of {@link supportedEfforts}. */
    defaultEffort: null | string
    /** Levels exactly as the API names them, e.g. `["low", "high"]`. */
    supportedEfforts: string[]
  }
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

export type ReasoningEffort = string

export interface ModelReasoningCapability {
  defaultEffort?: null | string
  mandatory: boolean
  supportedEfforts?: null | string[]
}

export interface ModelRunSettings {
  reasoningEffort?: null | string
  thinking?: boolean
}

export interface ModelProviderModel extends EntityBase {
  name: string
  providerId: ModelProvider["id"]
  reasoning?: ModelReasoningCapability
}

/**
 * Article extracted from a web page. Mirrors the result of Mozilla
 * Readability's `parse()` so protocol stays free of DOM dependencies.
 */
export interface PageContentArticle {
  title: null | string | undefined
  /** HTML string of the processed article content */
  content: null | string | undefined
  /** Text content of the article, with all the HTML tags removed */
  textContent: null | string | undefined
  /** Length of the article, in characters */
  length: null | number | undefined
  /** Article description, or short excerpt from the content */
  excerpt: null | string | undefined
  byline: null | string | undefined
  /** Content direction */
  dir: null | string | undefined
  siteName: null | string | undefined
  lang: null | string | undefined
  publishedTime: null | string | undefined
}

export type PageContent = PageContentArticle & {
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
 * A saved prompt. Typing `/` in the message box opens a menu of prompts;
 * choosing one inserts its {@link Prompt.text} into the message, where it can
 * still be edited before sending.
 *
 * Built-in prompts ship with the extension and are read-only; user prompts are
 * created in Settings → Prompts. Prompts replace the former slash commands,
 * which are migrated on upgrade (command name → title, prompt → text).
 */
export interface Prompt extends EntityBase {
  /** Name shown in the `/` menu and matched while filtering. */
  title: string
  /** Text inserted into the message box. */
  text: string
  /** Whether the prompt ships with the extension and is read-only for users. */
  builtin: boolean
  /**
   * Name of the slash command this prompt was migrated from. Messages sent
   * before the migration that start with `/<name>` are still expanded with
   * this prompt's text when the conversation is sent to the model.
   */
  legacyCommandName?: string
}

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

/** Retention periods offered in Settings → General. */
export const chatRetentionOptions = [30, 90, 180, null] as const

export type ChatRetentionDays = (typeof chatRetentionOptions)[number]

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
   * Days after their last update that unpinned chats are deleted, or `null`
   * to keep chats forever. Defaults to `null`.
   */
  chatRetentionDays?: ChatRetentionDays
  /**
   * User-configured MCP servers. Defaults to an empty list. The available
   * tools for every configured server are loaded eagerly (regardless of
   * whether the server is enabled in a chat) so the tools UI can render them
   * immediately. A server is enabled per-chat by toggling its group checkbox,
   * which enables all of its tools at once.
   */
  mcpServers?: McpServer[]
}
