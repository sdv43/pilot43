import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ModelProvider } from "@/offscreen/storage"
import type { Chat, ChatSettings, MessageUser, Workspace } from "@/shared/api"

import {
  TITLE_GENERATION_DISABLED,
  TITLE_GENERATION_USE_CHAT_MODEL,
} from "@/shared/api"

import { generatedChatTitleMaxLength } from "../../const"
import { ensureChatForMessage } from "./ensureChatForMessage"

vi.mock("@/offscreen/storage", () => ({
  createChat: vi.fn(),
  getAppSettings: vi.fn(),
  getChatById: vi.fn(),
  getModelProviderById: vi.fn(),
  getWorkspaceById: vi.fn(),
  updateChatTitle: vi.fn(),
  updateWorkspace: vi.fn(),
}))

vi.mock("@/offscreen/models", () => ({
  createModelAdapter: vi.fn(),
}))

import { createModelAdapter } from "@/offscreen/models"
import {
  createChat,
  getAppSettings,
  getChatById,
  getModelProviderById,
  getWorkspaceById,
  updateChatTitle,
  updateWorkspace,
} from "@/offscreen/storage"

const NOW = 1_700_000_000_000

const provider: ModelProvider = {
  id: "provider-1",
  name: "OpenAI",
  type: "openai",
  settings: { apiKey: "secret" },
}

const workspace: Workspace = {
  id: "workspace-1",
  name: "My workspace",
  lastSelectedChatId: null,
}

const existingChat: Chat = {
  id: "chat-1",
  workspaceId: workspace.id,
  title: "Existing chat",
  settings: { tools: [] },
  createdAt: NOW,
  updatedAt: NOW,
}

const inputMessage: Pick<
  MessageUser,
  "attachmentReferences" | "attachments" | "content"
> = {
  attachmentReferences: [],
  attachments: [],
  content: "Hello, world!",
}

const initialSettings: ChatSettings = {
  tools: [{ enabled: true, name: "fetch" }],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getChatById).mockResolvedValue(existingChat)
  vi.mocked(getWorkspaceById).mockResolvedValue(workspace)
  vi.mocked(createChat).mockResolvedValue(existingChat)
  vi.mocked(getAppSettings).mockResolvedValue({
    titleGenerationModel: TITLE_GENERATION_USE_CHAT_MODEL,
    id: "app",
  })
  vi.mocked(getModelProviderById).mockResolvedValue(provider)
  vi.mocked(updateChatTitle).mockResolvedValue(existingChat)
  vi.mocked(updateWorkspace).mockResolvedValue(workspace)
  vi.mocked(createModelAdapter).mockReturnValue({
    chat: vi.fn().mockReturnValue({
      *[Symbol.asyncIterator]() {
        yield { content: "Generated title", done: true }
      },
    }),
    listModels: vi.fn().mockResolvedValue([]),
  })
})

describe("ensureChatForMessage", () => {
  it("returns the existing chat when a chat id is provided", async () => {
    const result = await ensureChatForMessage(
      existingChat.id,
      workspace.id,
      "gpt-4",
      provider,
      inputMessage as MessageUser,
      initialSettings,
    )

    expect(result).toEqual(existingChat)
    expect(getChatById).toHaveBeenCalledWith(existingChat.id)
    expect(createChat).not.toHaveBeenCalled()
    expect(updateWorkspace).not.toHaveBeenCalled()
    expect(getWorkspaceById).not.toHaveBeenCalled()
  })

  it("throws when the requested chat does not exist", async () => {
    vi.mocked(getChatById).mockResolvedValue(undefined)

    await expect(
      ensureChatForMessage(
        existingChat.id,
        workspace.id,
        "gpt-4",
        provider,
        inputMessage as MessageUser,
        initialSettings,
      ),
    ).rejects.toThrow("Chat not found")
  })

  it("throws when the workspace does not exist for a new chat", async () => {
    vi.mocked(getWorkspaceById).mockResolvedValue(undefined)

    await expect(
      ensureChatForMessage(
        "",
        workspace.id,
        "gpt-4",
        provider,
        inputMessage as MessageUser,
        initialSettings,
      ),
    ).rejects.toThrow("Workspace not found")
  })

  it("creates a new chat, updates workspace state, and generates a title", async () => {
    const newChat: Chat = {
      id: "chat-2",
      workspaceId: workspace.id,
      title: "Hello, world!",
      settings: { tools: [] },
      createdAt: NOW,
      updatedAt: NOW,
    }

    vi.mocked(createChat).mockResolvedValue(newChat)

    const result = await ensureChatForMessage(
      "",
      workspace.id,
      "gpt-4",
      provider,
      inputMessage as MessageUser,
      initialSettings,
    )

    expect(result).toEqual(newChat)
    expect(createChat).toHaveBeenCalledWith(
      workspace.id,
      "Hello, world!",
      initialSettings,
    )
    expect(updateWorkspace).toHaveBeenCalledWith({
      ...workspace,
      lastSelectedChatId: newChat.id,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(updateChatTitle).toHaveBeenCalledWith(newChat.id, "Generated title")
  })

  it("skips title generation when the setting is disabled", async () => {
    vi.mocked(getAppSettings).mockResolvedValue({
      titleGenerationModel: TITLE_GENERATION_DISABLED,
      id: "app",
    })

    await ensureChatForMessage(
      "",
      workspace.id,
      "gpt-4",
      provider,
      inputMessage as MessageUser,
      initialSettings,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(createModelAdapter).not.toHaveBeenCalled()
    expect(updateChatTitle).not.toHaveBeenCalled()
  })

  it("uses the current chat model when title generation is configured to reuse it", async () => {
    vi.mocked(getAppSettings).mockResolvedValue({
      titleGenerationModel: TITLE_GENERATION_USE_CHAT_MODEL,
      id: "app",
    })

    await ensureChatForMessage(
      "",
      workspace.id,
      "gpt-4o",
      provider,
      inputMessage as MessageUser,
      initialSettings,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(createModelAdapter).toHaveBeenCalledWith(provider, "gpt-4o")
  })

  it("uses a specific configured provider/model when title generation points to one", async () => {
    vi.mocked(getAppSettings).mockResolvedValue({
      titleGenerationModel: "provider-1::gpt-4.1",
      id: "app",
    })

    await ensureChatForMessage(
      "",
      workspace.id,
      "gpt-4",
      provider,
      inputMessage as MessageUser,
      initialSettings,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getModelProviderById).toHaveBeenCalledWith("provider-1")
    expect(createModelAdapter).toHaveBeenCalledWith(provider, "gpt-4.1")
  })

  it("builds the prompt payload for chat title generation from the user message and attachments", async () => {
    const chatAdapter = {
      chat: vi.fn().mockReturnValue({
        *[Symbol.asyncIterator]() {
          yield { content: "Generated title", done: true }
        },
      }),
      listModels: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(createModelAdapter).mockReturnValue(chatAdapter)

    const messageWithAttachments: MessageUser = {
      ...inputMessage,
      id: "message-1",
      messageRunId: "run-1",
      role: "user",
      createdAt: NOW,
      attachments: [
        {
          type: "file",
          mediaType: "text/plain",
          name: "notes.txt",
          content: "hello",
          size: 5,
        },
      ],
    }

    await ensureChatForMessage(
      "",
      workspace.id,
      "gpt-4",
      provider,
      messageWithAttachments,
      initialSettings,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    const expectedSystemPrompt = `Generate a concise chat title from the first user message and attachments. Return only the title text without quotes, markdown, or explanations. Keep the title under ${generatedChatTitleMaxLength} characters.`
    const expectedUserPrompt =
      "Create a short descriptive title for this conversation:\n\nMessage: Hello, world!\nAttachments: notes.txt"

    expect(chatAdapter.chat).toHaveBeenCalledWith(
      [
        {
          role: "system",
          content: expectedSystemPrompt,
        },
        {
          role: "user",
          content: expectedUserPrompt,
        },
      ],
      expect.objectContaining({
        maxTokens: 128,
        temperature: 0.2,
        thinking: false,
      }),
    )
  })
})
