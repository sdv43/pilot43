import { describe, expect, it } from "vitest"

import type {
  Chat,
  Command,
  MessageAssistant,
  MessageRun,
  MessageUser,
  MessageUserAnswer,
} from "@/shared/api"

import {
  buildConversationHistory,
  toConversationMessages,
} from "./chat-history"

function makeUserMessage(overrides: Partial<MessageUser> = {}): MessageUser {
  return {
    attachments: [],
    content: "Hello",
    createdAt: 100,
    id: "user-1",
    messageRunId: "run-1",
    role: "user",
    ...overrides,
  }
}

function makeAssistantMessage(
  overrides: Partial<MessageAssistant> = {},
): MessageAssistant {
  return {
    content: "Hi there",
    createdAt: 200,
    id: "assistant-1",
    messageRunId: "run-1",
    role: "assistant",
    tools: [],
    ...overrides,
  }
}

function makeMessageRun(overrides: Partial<MessageRun> = {}): MessageRun {
  return {
    assistantMessages: [],
    chatId: "chat-1",
    createdAt: 50,
    error: null,
    id: "run-1",
    modelMeta: {
      name: "gpt-4",
      provider: "provider-1",
      settings: {},
    },
    status: "completed",
    updatedAt: 300,
    userMessage: makeUserMessage(),
    ...overrides,
  }
}

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: "chat-1",
    settings: { tools: [] },
    title: "Example chat",
    workspaceId: "workspace-1",
    ...overrides,
  }
}

describe("buildConversationHistory", () => {
  it("returns a conversation with the system message and no user messages for an empty run list", () => {
    const conversation = buildConversationHistory([], makeChat(), [])

    expect(conversation).toHaveLength(1)
    expect(conversation[0].content).toContain("You are assisting a user")
    expect(conversation[0].role).toBe("system")
  })

  it("includes the user message and sorted assistant messages for each run", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({ content: "First run" }),
      assistantMessages: [
        makeAssistantMessage({ content: "Second response", createdAt: 400 }),
        makeAssistantMessage({ content: "First response", createdAt: 300 }),
      ],
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    expect(conversation).toHaveLength(4)
    expect(conversation.map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "assistant",
    ])
    expect(conversation[1].content).toContain("First run")
    expect(conversation[1].role).toBe("user")
    // Assistant messages are sorted by createdAt even though they were
    // provided in reverse order.
    expect(conversation[2].content).toBe("First response")
    expect(conversation[3].content).toBe("Second response")
  })

  it("flattens multiple runs in order", () => {
    const conversation = buildConversationHistory(
      [
        makeMessageRun({
          id: "run-1",
          userMessage: makeUserMessage({ content: "Message one" }),
        }),
        makeMessageRun({
          id: "run-2",
          userMessage: makeUserMessage({
            content: "Message two",
            id: "user-2",
            messageRunId: "run-2",
          }),
        }),
      ],
      makeChat(),
      [],
    )

    expect(conversation.map((message) => message.role)).toEqual([
      "system",
      "user",
      "user",
    ])
    expect(conversation[1].content).toContain("Message one")
    expect(conversation[2].content).toContain("Message two")
  })

  it("wraps plain user content in a userRequest block", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachments: [],
        content: "Plain message",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    expect(conversation[1]).toMatchObject({
      content: "<userRequest>\nPlain message\n</userRequest>",
      role: "user",
    })
  })

  it("serializes file attachments and attachment references", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachmentReferences: [
          { attachmentIndex: 0, end: 7, id: "abc", start: 4 },
        ],
        attachments: [
          {
            content: "File body",
            mediaType: "text/plain",
            name: "notes.txt",
            size: 100,
            type: "file",
          },
        ],
        content: "See {1}",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    const userMessage = conversation[1]
    expect(userMessage).toMatchObject({ role: "user" })
    expect(userMessage.content).toContain('id="abc"')
    expect(userMessage.content).toContain("File body")
    // The {1} reference is replaced by the attachment id.
    expect(userMessage.content).toContain("See #abc")
  })

  it("passes image file attachments through the multimodal images field", () => {
    const image: MessageUser["attachments"][number] = {
      content: "aW1hZ2U=",
      mediaType: "image/png",
      name: "screenshot.png",
      size: 1024,
      type: "file",
    }
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachments: [image],
        content: "Look at this",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    expect(conversation[1].content).toContain(
      "[Image attachment provided separately to the model.]",
    )
    expect(conversation[1]).toMatchObject({
      images: [image],
      role: "user",
    })
  })

  it("serializes page-content and page-content-selection attachments", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachments: [
          {
            byline: null,
            content: "Page body",
            dir: null,
            excerpt: "Text body",
            id: 7,
            lang: null,
            length: 9,
            publishedTime: null,
            siteName: null,
            textContent: "Text body",
            title: "My page",
            type: "page-content",
            url: "https://example.com",
          },
          {
            content: "Selection body",
            description: "A selection",
            id: 7,
            title: "My page",
            type: "page-content-selection",
            uniqueKey: "selection-1",
            url: "https://example.com",
          },
        ],
        content: "",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    const serialized = conversation[1].content
    expect(serialized).toContain('type="page-content"')
    expect(serialized).toContain("Text body")
    expect(serialized).toContain('type="page-content-selection"')
    expect(serialized).toContain("Selection body")
    expect(serialized).toContain("A selection")
    // No user request content, so only the attachments block is present.
    expect(serialized).not.toContain("<userRequest>")
  })

  it("expands a leading slash command against the matching command prompt when the message has attachments", () => {
    const command: Command = {
      builtin: true,
      id: "cmd-1",
      name: "fix",
      prompt: "Fix the issues in the code",
    }
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachments: [
          {
            content: "File body",
            mediaType: "text/plain",
            name: "notes.txt",
            size: 100,
            type: "file",
          },
        ],
        commandReference: {
          command: "fix",
          end: 4,
          id: "cmd-ref-1",
          start: 0,
        },
        content: "/fix review the diff",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [command])

    expect(conversation[1].content).toContain(
      "Fix the issues in the code\n\nreview the diff",
    )
    expect(conversation[1].role).toBe("user")
  })

  it("leaves slash commands untouched when there is no matching command", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachments: [],
        content: "/unknown do something",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    expect(conversation[1]).toMatchObject({
      content: "<userRequest>\n/unknown do something\n</userRequest>",
    })
  })

  it("expands a leading slash command even when the message has no attachments", () => {
    const command: Command = {
      builtin: true,
      id: "cmd-1",
      name: "fix",
      prompt: "Fix the issues in the code",
    }
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachments: [],
        commandReference: {
          command: "fix",
          end: 4,
          id: "cmd-ref-1",
          start: 0,
        },
        content: "/fix review the diff",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [command])

    expect(conversation[1]).toMatchObject({
      content:
        "<userRequest>\nFix the issues in the code\n\nreview the diff\n</userRequest>",
      role: "user",
    })
  })

  it("expands a leading slash command to the full prompt when there is no trailing text", () => {
    const command: Command = {
      builtin: true,
      id: "cmd-1",
      name: "fix",
      prompt: "Fix the issues in the code",
    }
    const run = makeMessageRun({
      userMessage: makeUserMessage({
        attachments: [],
        content: "/fix",
      }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [command])

    expect(conversation[1]).toMatchObject({
      content: "<userRequest>\nFix the issues in the code\n</userRequest>",
      role: "user",
    })
  })

  it("includes a user_answer message as a plain user message", () => {
    const run = makeMessageRun({
      assistantMessages: [
        {
          content: "My answer",
          createdAt: 250,
          id: "user-answer-1",
          messageRunId: "run-1",
          role: "user_answer",
        },
      ],
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    expect(conversation.map((message) => message.role)).toEqual([
      "system",
      "user",
      "user",
    ])
    expect(conversation[2]).toMatchObject({ content: "My answer" })
  })

  it("serializes assistant tool calls and tool results", () => {
    const run = makeMessageRun({
      assistantMessages: [
        makeAssistantMessage({
          content: "Let me check",
          tools: [
            {
              args: { city: "Paris" },
              id: "call-1",
              name: "get_weather",
              result: { temperature: 20 },
            },
            {
              args: { city: "London" },
              name: "get_weather",
              result: null,
            },
          ],
        }),
      ],
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    expect(conversation.map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
    ])
    expect(conversation[2]).toMatchObject({
      content: "Let me check",
      role: "assistant",
      toolCalls: [
        { arguments: '{"city":"Paris"}', id: "call-1", name: "get_weather" },
        {
          arguments: '{"city":"London"}',
          id: "assistant-1-tool-1",
          name: "get_weather",
        },
      ],
    })
    // Tool results with a null result are skipped; results are serialized as
    // tool messages referencing the originating tool call id.
    expect(conversation[3]).toMatchObject({
      content: '{"temperature":20}',
      role: "tool",
      toolCallId: "call-1",
      toolName: "get_weather",
    })
  })

  it("prepends the environment and todo list blocks to the last user message", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({ content: "Do the work" }),
    })
    const chat = makeChat({
      todoList: "- [ ] step one\n- [ ] step two",
    })

    const conversation = buildConversationHistory([run], chat, [])

    const userMessage = conversation[1]
    expect(userMessage.content).toContain("<environment>")
    expect(userMessage.content).toContain("<todo_list>")
    expect(userMessage.content).toContain("- [ ] step one")
    expect(userMessage.content).toContain("Do the work")
  })

  it("does not inject the todo list when the chat has no todo list", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({ content: "Do the work" }),
    })

    const conversation = buildConversationHistory([run], makeChat(), [])

    expect(conversation[1].content).not.toContain("<environment>")
    expect(conversation[1].content).not.toContain("<todo_list>")
  })

  it("does not inject the todo list when the chat is undefined", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({ content: "Do the work" }),
    })

    const conversation = buildConversationHistory([run], undefined, [])

    expect(conversation[1].content).not.toContain("<todo_list>")
  })

  it("does not inject the todo list when it is blank/whitespace", () => {
    const run = makeMessageRun({
      userMessage: makeUserMessage({ content: "Do the work" }),
    })
    const chat = makeChat({ todoList: "   " })

    const conversation = buildConversationHistory([run], chat, [])

    expect(conversation[1].content).not.toContain("<todo_list>")
  })

  it("leaves the conversation untouched when the run has no user messages", () => {
    const conversation = buildConversationHistory([], makeChat(), [])

    expect(conversation).toHaveLength(1)
    expect(conversation[0].role).toBe("system")
  })

  it("does not inject the todo list when there is no user message to attach it to", () => {
    const chat = makeChat({ todoList: "- [ ] step one" })

    // No runs means no user message exists, so findLastIndex returns -1 and
    // the todo list is skipped.
    const conversation = buildConversationHistory([], chat, [])

    expect(conversation).toHaveLength(1)
    expect(conversation[0].content).not.toContain("<todo_list>")
  })
})

describe("toConversationMessages", () => {
  it("converts a plain user message into a userRequest block", () => {
    const messages = toConversationMessages(makeUserMessage({ content: "Hi" }))

    expect(messages).toEqual([
      {
        content: "<userRequest>\nHi\n</userRequest>",
        role: "user",
      },
    ])
  })

  it("converts a user_answer message into a plain user message", () => {
    const answer: MessageUserAnswer = {
      content: "Sure, continue",
      createdAt: 250,
      id: "answer-1",
      messageRunId: "run-1",
      role: "user_answer",
    }

    expect(toConversationMessages(answer)).toEqual([
      { content: "Sure, continue", role: "user" },
    ])
  })

  it("converts an assistant message without tools", () => {
    const messages = toConversationMessages(
      makeAssistantMessage({ content: "No tools" }),
    )

    expect(messages).toEqual([{ content: "No tools", role: "assistant" }])
  })

  it("converts an assistant message with tools and results", () => {
    const assistant = makeAssistantMessage({
      content: "",
      id: "assistant-2",
      tools: [
        {
          args: { query: "ts" },
          id: "call-1",
          name: "search",
          result: { hits: 3 },
        },
      ],
    })

    const messages = toConversationMessages(assistant)

    expect(messages).toEqual([
      {
        content: "",
        role: "assistant",
        toolCalls: [
          { arguments: '{"query":"ts"}', id: "call-1", name: "search" },
        ],
      },
      {
        content: '{"hits":3}',
        role: "tool",
        toolCallId: "call-1",
        toolName: "search",
      },
    ])
  })

  it("skips tool messages for tool calls without a result", () => {
    const assistant = makeAssistantMessage({
      content: "",
      tools: [{ args: null, name: "search", result: null }],
    })

    const messages = toConversationMessages(assistant)

    expect(messages).toEqual([
      {
        content: "",
        role: "assistant",
        toolCalls: [
          { arguments: "{}", id: "assistant-1-tool-0", name: "search" },
        ],
      },
    ])
  })
})
