import type {
  Chat,
  MessageAssistant,
  MessageAssistantTool,
} from "@pilot43/protocol"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ToolCallsExecution } from "./runtime"
import type { Tool, ToolPolicy } from "./types"

import { createTestContext } from "../test-utils"
import { MessageRunStoppedError } from "./errors"
import { executeToolCalls, getEnabledTools } from "./runtime"

function createTool(name: string, overrides: Partial<Tool> = {}): Tool {
  return {
    definition: { description: `${name} tool`, id: name, name },
    execute: vi.fn(() => Promise.resolve({ ok: true, tool: name })),
    inputSchema: {
      additionalProperties: false,
      properties: {
        value: { description: "Value", type: "string" },
      },
      required: [],
      type: "object",
    },
    ...overrides,
  }
}

function createChat(tools: Chat["settings"]["tools"] = []): Chat {
  return {
    createdAt: 1,
    id: "chat-1",
    settings: { tools },
    title: "Chat",
    updatedAt: 1,
    workspaceId: "workspace-1",
  }
}

function createAssistantMessage(): MessageAssistant {
  return {
    content: "",
    createdAt: 1,
    id: "assistant-1",
    messageRunId: "run-1",
    role: "assistant",
    tools: [],
  }
}

let execution: ToolCallsExecution

beforeEach(() => {
  execution = {
    askUser: vi.fn(() => Promise.resolve("answer")),
    chatId: "chat-1",
    messageRunId: "run-1",
    signal: new AbortController().signal,
    store: createTestContext().store,
  }
})

describe("getEnabledTools", () => {
  it("applies chat overrides and defaults to built-in tools", async () => {
    const tools = [
      createTool("default_on"),
      createTool("default_off", {
        definition: {
          defaultEnabled: false,
          description: "",
          id: "default_off",
          name: "default_off",
        },
      }),
      createTool("hidden", {
        definition: {
          description: "",
          hidden: true,
          id: "hidden",
          name: "hidden",
        },
      }),
    ]
    const toolNames = async (chat: Chat) =>
      (await getEnabledTools(chat, { providers: [], tools }, execution)).map(
        (tool) => tool.definition.name,
      )

    expect(await toolNames(createChat())).toEqual(["default_on", "hidden"])
    expect(
      await toolNames(
        createChat([
          { enabled: false, name: "default_on" },
          { enabled: true, name: "default_off" },
          { enabled: false, name: "hidden" },
        ]),
      ),
    ).toEqual(["default_off", "hidden"])
  })

  it("appends the tools resolved by providers", async () => {
    const chat = createChat()
    const provider = {
      resolveTools: vi.fn(() => Promise.resolve([createTool("provided")])),
    }

    const tools = await getEnabledTools(
      chat,
      { providers: [provider], tools: [createTool("builtin")] },
      execution,
    )

    expect(provider.resolveTools).toHaveBeenCalledWith(chat, execution)
    expect(tools.map((tool) => tool.definition.name)).toEqual([
      "builtin",
      "provided",
    ])
  })
})

describe("executeToolCalls", () => {
  it("executes enabled tools and records results in call order", async () => {
    const first = createTool("first")
    const second = createTool("second")
    const assistantMessage = createAssistantMessage()

    const { stopped } = await executeToolCalls(
      [
        { arguments: '{"value":"a"}', id: "call-1", name: "first" },
        { arguments: "", id: "call-2", name: "second" },
      ],
      [first, second],
      assistantMessage,
      execution,
    )

    expect(stopped).toBe(false)
    expect(first.execute).toHaveBeenCalledWith(
      { value: "a" },
      expect.objectContaining({ chatId: "chat-1", messageRunId: "run-1" }),
    )
    expect(assistantMessage.tools).toMatchObject([
      {
        args: { value: "a" },
        id: "call-1",
        name: "first",
        result: { ok: true, tool: "first" },
      },
      {
        args: {},
        id: "call-2",
        name: "second",
        result: { ok: true, tool: "second" },
      },
    ])
  })

  it("captures per-call errors without aborting the batch", async () => {
    const failing = createTool("failing", {
      execute: () => Promise.reject(new Error("Boom")),
    })
    const working = createTool("working")
    const assistantMessage = createAssistantMessage()

    await executeToolCalls(
      [
        { arguments: "{}", id: "call-1", name: "unknown" },
        { arguments: "{bad json", id: "call-2", name: "working" },
        { arguments: '{"extra":1}', id: "call-3", name: "working" },
        { arguments: "{}", id: "call-4", name: "failing" },
        { arguments: "{}", id: "call-5", name: "working" },
      ],
      [failing, working],
      assistantMessage,
      execution,
    )

    expect(assistantMessage.tools.map((tool) => tool.result)).toEqual([
      { error: "Tool `unknown` is not enabled.", ok: false },
      { error: expect.any(String) as string, ok: false },
      { error: "Unexpected parameter: extra.", ok: false },
      { error: "Boom", ok: false },
      { ok: true, tool: "working" },
    ])
    expect(assistantMessage.tools[1].args).toBeNull()
  })

  it("uses the tool's own argument validation when provided", async () => {
    const tool = createTool("custom", { validateArgs: vi.fn() })
    const assistantMessage = createAssistantMessage()

    await executeToolCalls(
      [{ arguments: '{"anything":[1]}', id: "call-1", name: "custom" }],
      [tool],
      assistantMessage,
      execution,
    )

    expect(tool.validateArgs).toHaveBeenCalledWith({ anything: [1] })
    expect(tool.execute).toHaveBeenCalled()
  })

  it("runs sequential tools one at a time before parallel tools", async () => {
    const events: string[] = []
    const track = (name: string) => () => {
      events.push(`start:${name}`)
      return Promise.resolve().then(() => {
        events.push(`end:${name}`)
        return { ok: true }
      })
    }
    const tools = [
      createTool("parallel", { execute: track("parallel") }),
      createTool("sequential_a", {
        execute: track("sequential_a"),
        execution: "sequential",
      }),
      createTool("sequential_b", {
        execute: track("sequential_b"),
        execution: "sequential",
      }),
    ]
    const assistantMessage = createAssistantMessage()

    await executeToolCalls(
      [
        { arguments: "{}", id: "call-1", name: "parallel" },
        { arguments: "{}", id: "call-2", name: "sequential_a" },
        { arguments: "{}", id: "call-3", name: "sequential_b" },
      ],
      tools,
      assistantMessage,
      execution,
    )

    expect(events).toEqual([
      "start:sequential_a",
      "end:sequential_a",
      "start:sequential_b",
      "end:sequential_b",
      "start:parallel",
      "end:parallel",
    ])
    expect(assistantMessage.tools.map((tool) => tool.id)).toEqual([
      "call-2",
      "call-3",
      "call-1",
    ])
  })

  it("stops and skips the remaining calls when a tool's question is cancelled", async () => {
    const asking = createTool("asking", {
      execute: (_args, context) =>
        context.askUser({ followUp: [], question: "?" }).then(() => ({})),
      execution: "sequential",
    })
    const later = createTool("later")
    execution.askUser = vi.fn(() =>
      Promise.reject(new MessageRunStoppedError()),
    )

    const { stopped } = await executeToolCalls(
      [
        { arguments: "{}", id: "call-1", name: "asking" },
        { arguments: "{}", id: "call-2", name: "later" },
      ],
      [asking, later],
      createAssistantMessage(),
      execution,
    )

    expect(stopped).toBe(true)
    expect(later.execute).not.toHaveBeenCalled()
  })

  it("passes the call's entry to askUser", async () => {
    const asking = createTool("asking", {
      execute: async (_args, context) => ({
        answer: await context.askUser({ followUp: [], question: "Why?" }),
      }),
    })
    const assistantMessage = createAssistantMessage()

    await executeToolCalls(
      [{ arguments: "{}", id: "call-1", name: "asking" }],
      [asking],
      assistantMessage,
      execution,
    )

    const [entry] = assistantMessage.tools
    expect(execution.askUser).toHaveBeenCalledWith(entry, {
      followUp: [],
      question: "Why?",
    })
    expect(entry.result).toEqual({ answer: "answer" })
  })

  it("generates a stable id when the provider omits the tool call id", async () => {
    const assistantMessage = createAssistantMessage()

    await executeToolCalls(
      [{ arguments: "{}", id: "", name: "tool" }],
      [createTool("tool")],
      assistantMessage,
      execution,
    )

    expect(assistantMessage.tools[0].id).toMatch(/^tool-/)
  })
})

describe("tool policy", () => {
  it("denies a call without executing the tool", async () => {
    const tool = createTool("guarded")
    const policy: ToolPolicy = {
      beforeExecute: vi.fn(() =>
        Promise.resolve({ allow: false as const, reason: "Not allowed." }),
      ),
    }
    const assistantMessage = createAssistantMessage()

    await executeToolCalls(
      [{ arguments: '{"value":"x"}', id: "call-1", name: "guarded" }],
      [tool],
      assistantMessage,
      { ...execution, policy },
    )

    expect(policy.beforeExecute).toHaveBeenCalledWith(
      { args: { value: "x" }, tool },
      expect.objectContaining({ chatId: "chat-1" }),
    )
    expect(tool.execute).not.toHaveBeenCalled()
    expect(assistantMessage.tools[0].result).toEqual({
      error: "Not allowed.",
      ok: false,
    })
  })

  it("reports results to afterExecute without letting it change them", async () => {
    const tool = createTool("observed")
    const policy: ToolPolicy = {
      afterExecute: vi.fn(() => Promise.reject(new Error("Hook failed"))),
      beforeExecute: () => Promise.resolve({ allow: true as const }),
    }
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    const assistantMessage = createAssistantMessage()

    await executeToolCalls(
      [{ arguments: "{}", id: "call-1", name: "observed" }],
      [tool],
      assistantMessage,
      { ...execution, policy },
    )

    expect(policy.afterExecute).toHaveBeenCalledWith(
      { args: {}, tool },
      { ok: true, tool: "observed" },
      expect.objectContaining({ chatId: "chat-1" }),
    )
    expect(assistantMessage.tools[0]).toMatchObject<MessageAssistantTool>({
      args: {},
      id: "call-1",
      name: "observed",
      result: { ok: true, tool: "observed" },
    })
    consoleError.mockRestore()
  })
})
