import type {
  AppSettings,
  Chat,
  ChatSettings,
  Command,
  McpServer,
  MessageRun,
  MessageUser,
  ModelProviderModel,
  ModelTool,
  OllamaModelProvider,
  OpenAIModelProvider,
  OpenRouterModelProvider,
  PageContent,
  PageContentSelection,
  Workspace,
} from "./entities"

type Providers =
  | OllamaModelProvider
  | OpenAIModelProvider
  | OpenRouterModelProvider

export interface ApiClient {
  appSettingsGet(): Promise<AppSettings>
  appSettingsUpdate(settings: AppSettings): Promise<AppSettings>

  workspaceGet(): Promise<Workspace[]>
  workspaceCreate(workspace: Pick<Workspace, "name">): Promise<Workspace>
  workspaceUpdate(workspace: Workspace): Promise<Workspace>
  workspaceDelete(workspaceId: Workspace["id"]): Promise<void>

  chatGetByWorkspace(workspaceId: Workspace["id"]): Promise<Chat[]>
  chatDelete(chatId: Chat["id"]): Promise<void>

  chatMessageSend(
    chatId: Chat["id"],
    message: Pick<
      MessageUser,
      "attachmentReferences" | "attachments" | "commandReference" | "content"
    >,
    model: Pick<ModelProviderModel, "name" | "providerId">,
    workspaceId: Workspace["id"],
    initialSettings?: ChatSettings,
  ): Promise<MessageUser>

  /**
   * The chatTokenEstimateGet method estimates the number of tokens going to be used for the next potential message.
   */
  chatTokenEstimateGet(chatId?: Chat["id"] | null): Promise<null | number>

  chatMessageRunGet(chatId: Chat["id"]): Promise<MessageRun[]>
  chatMessageRunRetry(id: MessageRun["id"]): Promise<void>
  chatMessageRunStop(id: MessageRun["id"]): Promise<void>
  chatMessageRunDelete(id: MessageRun["id"]): Promise<void>
  chatMessageRunDeleteAfter(id: MessageRun["id"]): Promise<void>

  /**
   * Submits the user's answer to a prompt that paused generation — either a
   * follow-up question (see `ask_followup_question`) or the round-trip
   * continuation confirmation. Resumes the message run's generation.
   */
  chatMessageRunAnswer(id: MessageRun["id"], answer: string): Promise<void>

  chatSettingsUpdate(chatId: Chat["id"], settings: ChatSettings): Promise<Chat>
  chatTitleUpdate(chatId: Chat["id"], title: string): Promise<Chat>

  /**
   * Clears the chat's step-by-step todo checklist (the `update_todo_list`
   * tool state bound to the chat).
   */
  chatTodoListClear(chatId: Chat["id"]): Promise<void>

  modelProviderTypeGet(): Promise<
    {
      type: Providers["type"]
      name: string
    }[]
  >
  modelProviderGet(): Promise<Providers[]>
  modelProviderCreate(
    modelProvider: Pick<
      Providers,
      "maxRequestPerMinute" | "name" | "settings" | "type"
    >,
  ): Promise<Providers>
  modelProviderUpdate(modelProvider: Providers): Promise<Providers>
  modelProviderDelete(id: Providers["id"]): Promise<void>
  modelProviderModelGet(
    providerId: Providers["id"],
  ): Promise<ModelProviderModel[]>
  modelProviderCheck(
    provider: Providers,
  ): Promise<{ success: boolean; message: string }>

  modelToolGet(): Promise<ModelTool[]>

  mcpServerGet(): Promise<McpServer[]>
  /**
   * Replaces the full list of MCP servers. Names must be unique and URLs must
   * be absolute http(s) URLs.
   */
  mcpServerUpdate(servers: McpServer[]): Promise<McpServer[]>
  /**
   * Connects to an MCP server and returns the tool definitions it exposes.
   * Throws when the server is unreachable or returns an error.
   */
  mcpServerToolsGet(server: McpServer): Promise<ModelTool[]>

  commandGet(): Promise<Command[]>
  commandCreate(
    command: Pick<Command, "description" | "name" | "prompt">,
  ): Promise<Command>
  commandUpdate(command: Command): Promise<Command>
  commandDelete(id: Command["id"]): Promise<void>

  pageContentGet(): Promise<Pick<PageContent, "id" | "title" | "url">[]>
  pageContentGetById(id: PageContent["id"]): Promise<null | PageContent>
  pageContentSelectionGet(): Promise<null | PageContentSelection>
}
