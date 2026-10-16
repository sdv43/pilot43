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
