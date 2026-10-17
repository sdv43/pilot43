import type { Chat, MessageAssistant, MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../../context"

/** Maximum length of {@link Chat.preview}. */
export const chatPreviewMaxLength = 160

/** Last status synced per run, so streaming chunks don't touch the chat. */
const syncedStatusByRun = new Map<MessageRun["id"], MessageRun["status"]>()

export function isGeneratingStatus(status: MessageRun["status"]) {
  return (
    status === "pending" || status === "running" || status === "awaiting_input"
  )
}

/** Plain-text excerpt of the run's last assistant reply. */
export function buildChatPreview(run: MessageRun): string | undefined {
  const reply = run.assistantMessages
    .filter(
      (message): message is MessageAssistant =>
        message.role === "assistant" && !!message.content.trim(),
    )
    .at(-1)

  if (!reply) {
    return undefined
  }

  const text = reply.content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  return text.length > chatPreviewMaxLength
    ? `${text.slice(0, chatPreviewMaxLength - 1)}…`
    : text
}

/**
 * Keeps the chat's `isGenerating` flag and `preview` in step with a run.
 * Only writes when the run's status changed since the last sync.
 */
export async function syncChatWithRun(
  ctx: AgentContext,
  chatId: Chat["id"],
  run: MessageRun,
) {
  if (syncedStatusByRun.get(run.id) === run.status) {
    return
  }

  syncedStatusByRun.set(run.id, run.status)

  if (!isGeneratingStatus(run.status)) {
    syncedStatusByRun.delete(run.id)
  }

  const chat = await ctx.store.getChatById(chatId)

  if (!chat) {
    return
  }

  const isGenerating = isGeneratingStatus(run.status)
  const preview =
    run.status === "completed"
      ? (buildChatPreview(run) ?? chat.preview)
      : chat.preview

  if (chat.isGenerating !== isGenerating || chat.preview !== preview) {
    await ctx.store.updateChatState(chatId, { isGenerating, preview })
  }
}
