import type { Chat, ModelProviderModel } from "@pilot43/protocol"

import { builtinPrompts } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { createModelAdapter } from "../../models"
import { resolveModelContextWindow } from "../model-provider-handlers"
import { summariseChatHistory } from "./utils/history-summary"

/**
 * `/compact`: folds all of the chat's runs into its history summary with the
 * given model (see `BackendApi.chatHistoryCompact`).
 */
export async function handleChatHistoryCompact(
  ctx: AgentContext,
  chatId: Chat["id"],
  model: Pick<ModelProviderModel, "contextWindow" | "name" | "providerId">,
): Promise<void> {
  const chat = await ctx.store.getChatById(chatId)
  if (!chat) {
    throw new Error("Chat not found")
  }

  if (chat.isGenerating || chat.isSummarisingHistory) {
    throw new Error("Wait for the assistant to finish first.")
  }

  const provider = await ctx.store.getModelProviderById(model.providerId)
  if (!provider) {
    throw new Error("Model provider not found")
  }

  const runs = await ctx.store.getMessageRunsByChat(chatId)
  const lastRun = runs.at(-1)
  if (!lastRun) {
    throw new Error("There is nothing to summarise yet.")
  }

  const summary = await summariseChatHistory(ctx, {
    adapter: createModelAdapter(provider, model.name),
    chatId,
    contextWindow:
      model.contextWindow ??
      resolveModelContextWindow(provider, { id: model.name, name: model.name }),
    keepRecent: false,
    notifyRunId: lastRun.id,
    prompts: [...builtinPrompts, ...(await ctx.store.getAllPrompts())],
    runs,
  })

  if (!summary) {
    throw new Error("The chat is already summarised.")
  }
}
