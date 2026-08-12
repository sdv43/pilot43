import type { MessageRun } from "@/shared/api"

import { deleteMessageRun } from "../../storage"

export async function handleChatMessageRunDelete(
  id: MessageRun["id"],
): Promise<void> {
  await deleteMessageRun(id)
}
