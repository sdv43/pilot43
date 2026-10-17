import { type Mocked, vi } from "vitest"

import type { AgentContext } from "./context"
import type { AgentStorage, AgentStore } from "./storage"

import { createAgentStore } from "./storage"

export interface TestContext extends AgentContext {
  notifier: Mocked<AgentContext["notifier"]>
  store: Mocked<AgentStore>
}

/**
 * Creates an {@link AgentContext} for unit tests whose store functions and
 * notifier are `vi.fn()` mocks.
 */
export function createTestContext(
  overrides: Partial<AgentContext> = {},
): TestContext {
  const storeKeys = Object.keys(createAgentStore({} as AgentStorage))
  const store = Object.fromEntries(
    storeKeys.map((key) => [key, vi.fn()]),
  ) as unknown as Mocked<AgentStore>

  return {
    notifier: { notify: vi.fn() },
    store,
    systemPrompt: () => "System prompt",
    toolset: { providers: [], tools: [] },
    ...overrides,
  } as TestContext
}
