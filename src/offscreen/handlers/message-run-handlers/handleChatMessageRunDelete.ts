import type { MessageRun } from "@pilot43/protocol"

import { deleteMessageRun } from "../../storage"

export async function handleChatMessageRunDelete(
  id: MessageRun["id"],
): Promise<void> {
  await deleteMessageRun(id)
}
