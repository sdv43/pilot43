import type { Workspace } from "@pilot43/protocol"

import type { AgentContext } from "../context"

import { deleteChatWithData } from "./chat-handlers"
import { isGeneratingStatus } from "./message-run-handlers/utils/sync-chat"
import { handleWorkspaceDelete } from "./workspace-handlers"

const day = 24 * 60 * 60 * 1000

/** Name of the workspace created after all data is deleted. */
export const defaultWorkspaceName = "Personal"

export async function handleDataDeleteAll(
  ctx: AgentContext,
): Promise<Workspace> {
  for (const workspace of await ctx.store.getAllWorkspaces()) {
    await handleWorkspaceDelete(ctx, workspace.id)
  }

  return await ctx.store.createWorkspace({ name: defaultWorkspaceName })
}

/**
 * Deletes unpinned chats that were last updated longer ago than the retention
 * period in the app settings. Does nothing when chats are kept forever.
 * Returns the number of deleted chats.
 */
export async function deleteExpiredChats(
  ctx: AgentContext,
  now = Date.now(),
): Promise<number> {
  const { chatRetentionDays } = await ctx.store.getAppSettings()

  if (!chatRetentionDays) {
    return 0
  }

  const cutoff = now - chatRetentionDays * day
  let deleted = 0

  for (const workspace of await ctx.store.getAllWorkspaces()) {
    for (const chat of await ctx.store.getChatsByWorkspace(workspace.id)) {
      const updatedAt = chat.updatedAt ?? chat.createdAt ?? now

      if (!chat.settings.pinned && updatedAt < cutoff) {
        await deleteChatWithData(ctx, chat.id)
        deleted += 1
      }
    }
  }

  if (deleted > 0) {
    ctx.notifier.notify({ action: "chatsChanged" })
  }

  return deleted
}

/**
 * Marks runs that were still generating when the agent stopped (e.g. the
 * extension was reloaded) as stopped, and clears their chats' generating
 * flag. Call once when the agent starts, before any new run.
 */
export async function recoverInterruptedRuns(ctx: AgentContext) {
  let recovered = 0

  for (const workspace of await ctx.store.getAllWorkspaces()) {
    for (const chat of await ctx.store.getChatsByWorkspace(workspace.id)) {
      if (!chat.isGenerating) {
        continue
      }

      for (const run of await ctx.store.getMessageRunsByChat(chat.id)) {
        if (isGeneratingStatus(run.status)) {
          await ctx.store.updateMessageRun({
            ...run,
            completedAt: Date.now(),
            continuationPrompt: null,
            followupQuestion: null,
            status: "stopped",
            toolApproval: null,
          })
          recovered += 1
        }
      }

      await ctx.store.updateChatState(chat.id, {
        isGenerating: false,
        preview: chat.preview,
      })
    }
  }

  if (recovered > 0) {
    ctx.notifier.notify({ action: "chatsChanged" })
  }

  return recovered
}
