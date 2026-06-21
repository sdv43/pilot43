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
  PageContent,
  PageContentSelection,
  Workspace,
} from "./entities"

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
  chatTokenEstimateGet(chatId: Chat["id"]): Promise<null | number>

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

  /**
   * Clears the chat's step-by-step todo checklist (the `update_todo_list`
   * tool state bound to the chat).
   */
  chatTodoListClear(chatId: Chat["id"]): Promise<void>

  modelProviderTypeGet(): Promise<
    {
      type: (OllamaModelProvider | OpenAIModelProvider)["type"]
      name: string
    }[]
  >
  modelProviderGet(): Promise<(OllamaModelProvider | OpenAIModelProvider)[]>
  modelProviderCreate(
    modelProvider: Pick<
      OllamaModelProvider | OpenAIModelProvider,
      "maxRequestPerMinute" | "name" | "settings" | "type"
    >,
  ): Promise<OllamaModelProvider | OpenAIModelProvider>
  modelProviderUpdate(
    modelProvider: OllamaModelProvider | OpenAIModelProvider,
  ): Promise<OllamaModelProvider | OpenAIModelProvider>
  modelProviderDelete(
    id: (OllamaModelProvider | OpenAIModelProvider)["id"],
  ): Promise<void>
  modelProviderModelGet(
    providerId: (OllamaModelProvider | OpenAIModelProvider)["id"],
  ): Promise<ModelProviderModel[]>
  modelProviderCheck(
    provider: OllamaModelProvider | OpenAIModelProvider,
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
