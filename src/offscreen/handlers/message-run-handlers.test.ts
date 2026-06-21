import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ModelProvider } from "@/offscreen/storage"
import type {
  Chat,
  ChatSettings,
  MessageUser,
  ModelProviderModel,
  Workspace,
} from "@/shared/api"

import { handleChatMessageSend } from "@/offscreen/handlers/message-run-handlers"
import { ensureChatForMessage } from "@/offscreen/handlers/utils/chat"
import { notifySidepanel } from "@/offscreen/handlers/utils/notification"
import { generateResponse } from "@/offscreen/handlers/utils/response-streaming"
import {
  createMessageRun,
  getModelProviderById,
  updateChatTimestamp,
} from "@/offscreen/storage"

// --- Module mocks (hoisted above imports by vitest) -------------------------

vi.mock("@/offscreen/storage", () => ({
  getModelProviderById: vi.fn(),
  createMessageRun: vi.fn(),
  updateChatTimestamp: vi.fn(),
}))

vi.mock("@/offscreen/handlers/utils/chat", () => ({
  ensureChatForMessage: vi.fn(),
}))

vi.mock("@/offscreen/handlers/utils/notification", () => ({
  notifySidepanel: vi.fn(),
}))

vi.mock("@/offscreen/handlers/utils/response-streaming", () => ({
  generateResponse: vi.fn(),
}))

// --- Fixtures ----------------------------------------------------------------

const NOW = 1_700_000_000_000
const RUN_ID = "11111111-1111-1111-1111-111111111111"
const MSG_ID = "22222222-2222-2222-2222-222222222222"

const provider: ModelProvider = {
  id: "provider-1",
  name: "OpenAI",
  type: "openai",
  settings: { apiKey: "secret" },
}

const model: Pick<ModelProviderModel, "name" | "providerId"> = {
  name: "gpt-4",
  providerId: "provider-1",
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

// --- Setup -------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  // Deterministic ids + timestamps so assertions are stable.
  vi.spyOn(crypto, "randomUUID")
    .mockReturnValueOnce(RUN_ID)
    .mockReturnValueOnce(MSG_ID)
  vi.spyOn(Date, "now").mockReturnValue(NOW)

  vi.mocked(getModelProviderById).mockResolvedValue(provider)
  vi.mocked(ensureChatForMessage).mockResolvedValue(existingChat)
  vi.mocked(createMessageRun).mockImplementation((run) => Promise.resolve(run))
  vi.mocked(updateChatTimestamp).mockResolvedValue(existingChat)
  vi.mocked(notifySidepanel).mockReturnValue(undefined)
  vi.mocked(generateResponse).mockResolvedValue(undefined)
})

// --- Tests -------------------------------------------------------------------

describe("handleChatMessageSend", () => {
  it("preserves command references on the stored user message", async () => {
    const messageWithCommandReference = {
      ...inputMessage,
      commandReference: {
        command: "test",
        end: 5,
        id: "command-1",
        start: 0,
      },
    } as Parameters<typeof handleChatMessageSend>[1]

    const result = await handleChatMessageSend(
      existingChat.id,
      messageWithCommandReference,
      model,
      workspace.id,
      initialSettings,
    )

    expect(result.commandReference).toEqual({
      command: "test",
      end: 5,
      id: "command-1",
      start: 0,
    })
  })

  it("creates a pending message run and starts generation for an existing chat", async () => {
    const result = await handleChatMessageSend(
      existingChat.id,
      inputMessage,
      model,
      workspace.id,
      initialSettings,
    )

    // Returns the user message with deterministic id + run id.
    expect(result).toEqual<MessageUser>({
      id: MSG_ID,
      messageRunId: RUN_ID,
      role: "user",
      attachmentReferences: [],
      attachments: [],
      content: "Hello, world!",
      createdAt: NOW,
    })

    // Resolves the provider.
    expect(getModelProviderById).toHaveBeenCalledWith(model.providerId)

    // Resolves the chat.
    expect(ensureChatForMessage).toHaveBeenCalledWith(
      existingChat.id,
      workspace.id,
      model.name,
      provider,
      expect.objectContaining<MessageUser>({
        id: MSG_ID,
        messageRunId: RUN_ID,
        role: "user",
        attachmentReferences: [],
        attachments: [],
        content: "Hello, world!",
        createdAt: NOW,
      }),
      initialSettings,
    )

    // Persists a pending message run with the correct model metadata.
    expect(createMessageRun).toHaveBeenCalledTimes(1)
    const savedRun = vi.mocked(createMessageRun).mock.calls[0][0]
    expect(savedRun).toMatchObject({
      id: RUN_ID,
      chatId: existingChat.id,
      status: "pending",
      assistantMessages: [],
      error: null,
      modelMeta: {
        name: model.name,
        provider: model.providerId,
        settings: {},
      },
    })
    expect(savedRun.userMessage).toEqual(result)

    // Bumps the chat timestamp.
    expect(updateChatTimestamp).toHaveBeenCalledWith(existingChat.id, NOW)

    // Notifies the sidepanel.
    expect(notifySidepanel).toHaveBeenCalledWith(existingChat.id, RUN_ID)

    // Kicks off generation (fire-and-forget) with the resolved chat + provider.
    expect(generateResponse).toHaveBeenCalledTimes(1)
    expect(generateResponse).toHaveBeenCalledWith(
      existingChat.id,
      RUN_ID,
      model.name,
      provider,
    )
  })
})
