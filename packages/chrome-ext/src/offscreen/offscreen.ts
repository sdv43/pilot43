import { createAgent } from "@pilot43/agent"
import { createIdbStorage } from "@pilot43/agent-browser"
import { backendApiMethods } from "@pilot43/protocol"

import { serveRpc } from "../shared/chrome"
import { chromeNotifier } from "./chrome-notifier"
import { extensionSystemMessage } from "./system-prompt"
import { toolset } from "./toolset"

console.debug("Offscreen document loaded")

const agent = createAgent({
  notifier: chromeNotifier,
  storage: createIdbStorage(),
  systemPrompt: extensionSystemMessage,
  toolset,
})

serveRpc("offscreen", agent.api, backendApiMethods)

/** How often chats past the retention period are deleted. */
const retentionCleanupIntervalMs = 60 * 60 * 1000

function deleteExpiredChats() {
  agent.deleteExpiredChats().catch((error: unknown) => {
    console.error("Error deleting expired chats:", error)
  })
}

agent
  .recoverInterruptedRuns()
  .catch((error: unknown) => {
    console.error("Error recovering interrupted runs:", error)
  })
  .finally(deleteExpiredChats)
setInterval(deleteExpiredChats, retentionCleanupIntervalMs)
