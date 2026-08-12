import type { MessageRun } from "@/shared/api"

import { getMessageRunById } from "../../storage"
import { resolveMessageRunAnswer } from "./utils/await-registry"

export async function handleChatMessageRunAnswer(
  id: MessageRun["id"],
  answer: string,
): Promise<void> {
  const messageRun = await getMessageRunById(id)
  if (!messageRun || messageRun.status !== "awaiting_input") {
    return
  }

  resolveMessageRunAnswer(id, answer)
}
