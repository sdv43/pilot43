import type { ApiNotification } from "@pilot43/protocol"

import type { AgentStore } from "./storage"
import type { Toolset } from "./tools/types"

/**
 * Delivers {@link ApiNotification}s to the clients of the agent (e.g. the
 * Chrome side panel) so they refetch changed data.
 */
export interface AgentNotifier {
  notify: (notification: ApiNotification) => void
}

/**
 * Platform-provided dependencies shared by the agent's handlers, generation
 * loop and tools.
 */
export interface AgentContext {
  notifier: AgentNotifier
  store: AgentStore
  /** System message that opens every conversation sent to the model. */
  systemPrompt: () => string
  toolset: Toolset
}
