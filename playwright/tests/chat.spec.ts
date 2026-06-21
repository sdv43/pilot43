import type { Chat, MessageRun, Workspace } from "../../src/shared/api"
import { expect, test } from "../fixtures"
import { getLatestToast } from "./utils/toast"
import { selectWorkspace } from "./utils/workspace"

test.describe("Chat new", () => {
  let workspaces: Workspace[] = [
    { id: "w1", name: "Workspace 1", lastSelectedChatId: "c1" },
  ]
  let chats: Chat[] = [
    {
      id: "c2",
      workspaceId: "w1",
      title: "Chat 2",
      settings: { tools: [] },
      updatedAt: Date.now() - 1000,
    },
    {
      id: "c1",
      workspaceId: "w1",
      title: "Chat 1",
      settings: { tools: [] },
      updatedAt: Date.now(),
    },
  ]
  const messageRun: MessageRun = {
    chatId: "c1",
    userMessage: {
      role: "user",
      attachments: [],
      messageRunId: "mr1",
      content: "Hello, assistant!",
      createdAt: Date.now(),
      id: "um1",
      tokenCount: 43,
    },
    assistantMessages: [],
    status: "pending",
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    modelMeta: {
      name: "gpt-4",
      provider: "openai",
      settings: {},
    },
    id: "mr1",
  }

  test.beforeEach(async ({ sidepanelPage }) => {
    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceUpdate = async (workspace) => {
      workspaces = workspaces.map((w) =>
        w.id === workspace.id ? workspace : w,
      )
      return workspace
    }
    sidepanelPage.mocks.chatDelete = async (chatId) => {
      chats = chats.filter((c) => c.id !== chatId)
    }
    sidepanelPage.mocks.chatGetByWorkspace = async () => chats
    sidepanelPage.mocks.appSettingsGet = async () => ({
      id: "app",
      titleGenerationModel: "disabled",
      titleModel: null,
    })
    sidepanelPage.mocks.modelProviderGet = async () => []
    sidepanelPage.mocks.modelProviderTypeGet = async () => []
    sidepanelPage.mocks.pageContentSelectionGet = async () => null
    sidepanelPage.mocks.pageContentGet = async () => []
    sidepanelPage.mocks.modelToolGet = async () => []
    sidepanelPage.mocks.commandGet = async () => []
    sidepanelPage.mocks.mcpServerGet = async () => []
    sidepanelPage.mocks.chatMessageRunGet = async () => []
    sidepanelPage.mocks.chatTokenEstimateGet = async () => 0
    sidepanelPage.mocks.chatSettingsUpdate = async (chatId, settings) => {
      chats = chats.map((c) => (c.id === chatId ? { ...c, settings } : c))
      return chats.find((c) => c.id === chatId)!
    }

    await sidepanelPage.open()
    await selectWorkspace(sidepanelPage.page, "Workspace 1")
  })

  test("should show user message", async ({ sidepanelPage }) => {
    sidepanelPage.mocks.chatMessageRunGet = async () => [messageRun]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })
    const userMessage = chat.getByTestId("user-message")

    // check user message content
    await expect(userMessage).toContainText("Hello, assistant!")

    // check copy button is enabled
    await expect(
      userMessage.getByRole("button", { name: "Copy message" }),
    ).toBeEnabled()

    // check regenerate button is disabled
    await expect(
      userMessage.getByRole("button", { name: "Regenerate response" }),
    ).toBeDisabled()

    // check notice message is displayed for pending status
    await expect(chat.getByText("Waiting for the response...")).toBeVisible()

    await expect(userMessage.getByTestId("user-message-tokens")).toHaveText(
      "43 tok",
    )
  })

  test("should show notice when message run is running", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.chatMessageRunGet = async () => [
      { ...messageRun, status: "running" },
    ]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })

    await expect(chat.getByText("Generating the response...")).toBeVisible()
  })

  test("should show notice when message run is stopped", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.chatMessageRunGet = async () => [
      { ...messageRun, status: "stopped" },
    ]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })

    await expect(chat.getByText("Generation stopped.")).toBeVisible()
  })

  test("should show multichoice notice when message run is awaiting_input", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.chatMessageRunGet = async () => [
      {
        ...messageRun,
        status: "awaiting_input",
        followupQuestion: {
          question: "What is your favorite color?",
          followUp: [{ text: "Red" }, { text: "Blue" }],
        },
      },
    ]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })

    // check that the followup question is displayed
    await expect(
      chat
        .getByTestId("followup-question")
        .getByText("What is your favorite color?"),
    ).toBeVisible()

    // check that the options are displayed
    await expect(
      chat
        .getByTestId("followup-question")
        .getByRole("button", { name: "Red" }),
    ).toBeVisible()

    await expect(
      chat
        .getByTestId("followup-question")
        .getByRole("button", { name: "Blue" }),
    ).toBeVisible()

    await expect(
      chat
        .getByTestId("followup-question")
        .getByRole("button", { name: "Custom answer" }),
    ).toBeVisible()
  })

  test("should show continuation prompt when message run is awaiting_input with continuationPrompt", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.chatMessageRunGet = async () => [
      {
        ...messageRun,
        status: "awaiting_input",
        continuationPrompt: {
          message:
            "The assistant has been working on its own for a while. Continue?",
        },
      },
    ]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })

    // The continuation prompt message is displayed.
    await expect(
      chat.getByTestId("continuation-prompt").getByText(/Continue\?/),
    ).toBeVisible()

    // Both action buttons are available.
    await expect(chat.getByTestId("continuation-prompt-continue")).toBeVisible()
    await expect(chat.getByTestId("continuation-prompt-stop")).toBeVisible()
  })

  test("should show user message with attachments", async ({
    sidepanelPage,
  }) => {
    const pageContentAttachment = {
      type: "page-content" as const,
      id: 123,
      url: "https://example.com/page",
      title: "Example Page",
      content: "This is the page content",
      textContent: "This is the page text content",
    }

    const pageContentSelectionAttachment = {
      type: "page-content-selection" as const,
      id: 123,
      uniqueKey: "selection-1",
      url: "https://example.com/page",
      title: "Example Page",
      description: "Selected text from the page",
      content: "This is the selected content",
    }

    const fileAttachment = {
      type: "file" as const,
      mediaType: "text/plain",
      name: "test.txt",
      content: "This is the file content",
      size: 100,
    }

    const emptyFileAttachment = {
      type: "file" as const,
      mediaType: "text/plain",
      name: "empty.txt",
      content: "",
      size: 0,
    }

    // @ts-expect-error pageContentAttachment does not have all the properties
    sidepanelPage.mocks.chatMessageRunGet = async () => [
      {
        ...messageRun,
        userMessage: {
          ...messageRun.userMessage,
          attachments: [
            pageContentAttachment,
            pageContentSelectionAttachment,
            fileAttachment,
            emptyFileAttachment,
          ],
        },
      },
    ]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", {
      name: "Chat history",
    })
    const userMessage = chat.getByTestId("user-message")
    const attachmentsContainer = userMessage.getByTestId(
      "user-message-attachments",
    )

    // Check that all 4 attachments are displayed
    await expect(
      attachmentsContainer.getByTestId("user-message-attachment"),
    ).toHaveCount(4)

    // Check page content attachment
    const pageContentBadge = attachmentsContainer
      .getByTestId("user-message-attachment")
      .nth(0)
    await expect(pageContentBadge).toContainText("Example Page")

    // Check page content selection attachment
    const pageSelectionBadge = attachmentsContainer
      .getByTestId("user-message-attachment")
      .nth(1)
    await expect(pageSelectionBadge).toContainText("Example Page")

    // Check file attachment
    const fileBadge = attachmentsContainer
      .getByTestId("user-message-attachment")
      .nth(2)
    await expect(fileBadge).toContainText("test.txt")

    // Check empty file attachment - should show "No preview available" in popover
    const emptyBadge = attachmentsContainer
      .getByTestId("user-message-attachment")
      .nth(3)
    await expect(emptyBadge).toContainText("empty.txt")

    // Check that clicking on an attachment shows the popover with content
    // Click on the file attachment to open its popover
    await fileBadge.click()

    // Check that the popover is visible with the attachment content
    // Use :popover-open to find the currently open popover
    const popover = chat.locator(
      '[data-testid="attachment-preview"]:popover-open',
    )
    await expect(popover).toBeVisible()
    await expect(popover.getByText("test.txt")).toBeVisible()
    await expect(popover.getByText("text/plain")).toBeVisible()
    await expect(popover.getByText("This is the file content")).toBeVisible()

    // Close the popover by pressing Escape
    await sidepanelPage.page.keyboard.press("Escape")

    // Click on the empty file attachment to verify "No preview available" in popover
    await emptyBadge.click()
    const emptyPopover = chat.locator(
      '[data-testid="attachment-preview"]:popover-open',
    )
    await expect(emptyPopover).toBeVisible()
    await expect(emptyPopover.getByText("No preview available.")).toBeVisible()

    // Close the popover
    await sidepanelPage.page.keyboard.press("Escape")

    // Click on page content attachment to verify its content in popover
    await pageContentBadge.click()
    const pageContentPopover = chat.locator(
      '[data-testid="attachment-preview"]:popover-open',
    )
    await expect(pageContentPopover).toBeVisible()
    await expect(pageContentPopover.getByText("Example Page")).toBeVisible()
    await expect(
      pageContentPopover.getByText("https://example.com/page"),
    ).toBeVisible()
    await expect(
      pageContentPopover.getByText("This is the page text content"),
    ).toBeVisible()

    // Close the popover
    await sidepanelPage.page.keyboard.press("Escape")

    // Click on page content selection attachment to verify its content in popover
    await pageSelectionBadge.click()
    const pageSelectionPopover = chat.locator(
      '[data-testid="attachment-preview"]:popover-open',
    )
    await expect(pageSelectionPopover).toBeVisible()
    await expect(pageSelectionPopover.getByText("Example Page")).toBeVisible()
    await expect(
      pageSelectionPopover.getByText("https://example.com/page"),
    ).toBeVisible()
    await expect(
      pageSelectionPopover.getByText("This is the selected content"),
    ).toBeVisible()
  })

  test("should show error message and retry button for failed message run", async ({
    sidepanelPage,
  }) => {
    let retriedMessageRunId: null | string = null

    sidepanelPage.mocks.chatMessageRunGet = async () => [
      {
        ...messageRun,
        status: "failed",
        error: "Failed to process the request.",
      },
    ]
    sidepanelPage.mocks.chatMessageRunRetry = async (id) => {
      retriedMessageRunId = id
    }

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", {
      name: "Chat history",
    })
    const errorMessage = chat.getByTestId("error-message")

    await expect(errorMessage).toContainText("Failed to process the request.")
    await expect(
      errorMessage.getByRole("button", { name: "Retry" }),
    ).toBeVisible()

    await errorMessage.getByRole("button", { name: "Retry" }).click()

    await expect.poll(() => retriedMessageRunId).toBe("mr1")
  })

  test("should show regenerate button only for the last message run", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.chatMessageRunGet = async () => [
      {
        ...messageRun,
        id: "mr0",
        userMessage: {
          ...messageRun.userMessage,
          id: "um0",
          messageRunId: "mr0",
          content: "First question",
        },
        assistantMessages: [
          {
            id: "am0",
            messageRunId: "mr0",
            role: "assistant",
            content: "First answer",
            createdAt: Date.now(),
            tokenCount: 11,
            tools: [],
          },
        ],
        status: "completed",
      },
      {
        ...messageRun,
        status: "completed",
        assistantMessages: [
          {
            id: "am1",
            messageRunId: "mr1",
            role: "assistant",
            content: "Second answer",
            createdAt: Date.now(),
            tokenCount: 12,
            tools: [],
          },
        ],
      },
    ]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", {
      name: "Chat history",
    })
    const userMessages = chat.getByTestId("user-message")

    await expect(userMessages).toHaveCount(2)
    await expect(
      userMessages.nth(0).getByRole("button", { name: "Regenerate response" }),
    ).toHaveCount(0)
    await expect(
      userMessages.nth(1).getByRole("button", { name: "Regenerate response" }),
    ).toBeVisible()
    await expect(
      userMessages.nth(1).getByRole("button", { name: "Regenerate response" }),
    ).toBeEnabled()
  })

  test("should show rollback button for all message runs except the last one", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.chatMessageRunGet = async () => [
      {
        ...messageRun,
        id: "mr0",
        userMessage: {
          ...messageRun.userMessage,
          id: "um0",
          messageRunId: "mr0",
          content: "First question",
        },
        assistantMessages: [
          {
            id: "am0",
            messageRunId: "mr0",
            role: "assistant",
            content: "First answer",
            createdAt: Date.now(),
            tokenCount: 11,
            tools: [],
          },
        ],
        status: "completed",
      },
      {
        ...messageRun,
        id: "mr1",
        userMessage: {
          ...messageRun.userMessage,
          id: "um1",
          messageRunId: "mr1",
          content: "Second question",
        },
        assistantMessages: [
          {
            id: "am1",
            messageRunId: "mr1",
            role: "assistant",
            content: "Second answer",
            createdAt: Date.now(),
            tokenCount: 12,
            tools: [],
          },
        ],
        status: "completed",
      },
      {
        ...messageRun,
        id: "mr2",
        userMessage: {
          ...messageRun.userMessage,
          id: "um2",
          messageRunId: "mr2",
          content: "Third question",
        },
        assistantMessages: [
          {
            id: "am2",
            messageRunId: "mr2",
            role: "assistant",
            content: "Third answer",
            createdAt: Date.now(),
            tokenCount: 13,
            tools: [],
          },
        ],
        status: "completed",
      },
    ]

    await sidepanelPage.page.reload()

    const chat = sidepanelPage.page.getByRole("region", {
      name: "Chat history",
    })

    await expect(chat.getByTestId("user-message")).toHaveCount(3)
    await expect(chat.getByTestId("history-divider")).toHaveCount(2)
    await expect(chat.getByTestId("history-divider-button")).toHaveCount(2)
  })

  test.describe("Assistant message", () => {
    test("should show tool call and allow expand and collapse", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.chatMessageRunGet = async () => [
        {
          ...messageRun,
          status: "completed",
          assistantMessages: [
            {
              id: "am-tool",
              messageRunId: "mr1",
              role: "assistant",
              content: "",
              thoughts: "",
              tools: [
                {
                  name: "weatherAPI",
                  args: { location: "New York" },
                  result: { temperature: "25°C", condition: "Sunny" },
                },
              ],
              createdAt: Date.now(),
              tokenCount: 24,
            },
          ],
        },
      ]

      await sidepanelPage.page.reload()

      const assistantMessage =
        sidepanelPage.page.getByTestId("assistant-message")
      const toolBlock = assistantMessage.getByTestId("assistant-tool")

      await expect(toolBlock).toBeVisible()
      await expect(toolBlock.getByTestId("spoiler-summary")).toContainText(
        "Call weatherAPI",
      )
      await expect(toolBlock.getByTestId("spoiler-content")).not.toBeVisible()

      await toolBlock.getByTestId("spoiler-summary").click()

      await expect(toolBlock.getByTestId("spoiler-content")).toBeVisible()
      await expect(toolBlock.getByTestId("spoiler-content")).toContainText(
        "Args:",
      )
      await expect(toolBlock.getByTestId("spoiler-content")).toContainText(
        '"location": "New York"',
      )
      await expect(toolBlock.getByTestId("spoiler-content")).toContainText(
        "Result:",
      )
      await expect(toolBlock.getByTestId("spoiler-content")).toContainText(
        '"condition": "Sunny"',
      )

      await toolBlock.getByTestId("spoiler-summary").click()

      await expect(toolBlock.getByTestId("spoiler-content")).not.toBeVisible()
    })

    test("should show thinking block and allow expand and collapse", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.chatMessageRunGet = async () => [
        {
          ...messageRun,
          status: "completed",
          assistantMessages: [
            {
              id: "am-thinking",
              messageRunId: "mr1",
              role: "assistant",
              content: "",
              thoughts: "Fetching weather data...",
              tools: [],
              createdAt: Date.now(),
              tokenCount: 24,
            },
          ],
        },
      ]

      await sidepanelPage.page.reload()

      const assistantMessage =
        sidepanelPage.page.getByTestId("assistant-message")
      const thinkingBlock = assistantMessage.getByTestId("assistant-thoughts")

      await expect(thinkingBlock).toBeVisible()
      await expect(thinkingBlock.getByTestId("spoiler-summary")).toContainText(
        "Fetching weather data...",
      )
      await expect(
        thinkingBlock.getByTestId("spoiler-content"),
      ).not.toBeVisible()

      await thinkingBlock.getByTestId("spoiler-summary").click()

      await expect(thinkingBlock.getByTestId("spoiler-content")).toBeVisible()
      await expect(thinkingBlock.getByTestId("spoiler-content")).toContainText(
        "Fetching weather data...",
      )

      await thinkingBlock.getByTestId("spoiler-summary").click()

      await expect(
        thinkingBlock.getByTestId("spoiler-content"),
      ).not.toBeVisible()
    })

    test("should show user response to follow-up question", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.chatMessageRunGet = async () => [
        {
          ...messageRun,
          status: "completed",
          followupQuestion: {
            question: "What is your favorite color?",
            followUp: [{ text: "Red" }, { text: "Blue" }],
          },
          assistantMessages: [
            {
              id: "ua1",
              messageRunId: "mr1",
              role: "user_answer",
              content: "Blue",
              createdAt: Date.now(),
              tokenCount: 1,
            },
            {
              id: "am-followup",
              messageRunId: "mr1",
              role: "assistant",
              content: "Blue is a great choice.",
              createdAt: Date.now(),
              tokenCount: 9,
              tools: [],
            },
          ],
        },
      ]

      await sidepanelPage.page.reload()

      const chat = sidepanelPage.page.getByRole("region", {
        name: "Chat history",
      })

      await expect(chat.getByTestId("user-answer-message")).toContainText(
        "Blue",
      )
      await expect(chat.getByTestId("followup-question")).toContainText(
        "What is your favorite color?",
      )
      await expect(
        chat.getByTestId("followup-question-answered"),
      ).toContainText("Answered")
    })

    test("should show assistant message content", async ({ sidepanelPage }) => {
      sidepanelPage.mocks.chatMessageRunGet = async () => [
        {
          ...messageRun,
          status: "completed",
          assistantMessages: [
            {
              id: "am-content",
              messageRunId: "mr1",
              role: "assistant",
              content: "I'm good, thank you!",
              createdAt: Date.now(),
              tokenCount: 19,
              tools: [],
            },
          ],
        },
      ]

      await sidepanelPage.page.reload()

      const assistantMessage =
        sidepanelPage.page.getByTestId("assistant-message")

      await expect(assistantMessage).toBeVisible()
      await expect(
        assistantMessage.getByTestId("assistant-content"),
      ).toContainText("I'm good, thank you!")
    })

    test("should copy assistant message", async ({ sidepanelPage }) => {
      sidepanelPage.mocks.chatMessageRunGet = async () => [
        {
          ...messageRun,
          status: "completed",
          assistantMessages: [
            {
              id: "am-copy",
              messageRunId: "mr1",
              role: "assistant",
              content: "I'm good, thank you!",
              createdAt: Date.now(),
              tokenCount: 19,
              tools: [],
            },
          ],
        },
      ]

      await sidepanelPage.page.reload()

      const assistantMessage =
        sidepanelPage.page.getByTestId("assistant-message")

      await assistantMessage
        .getByRole("button", { name: "Copy message" })
        .click()

      await expect(getLatestToast(sidepanelPage.page)).toContainText(
        "Copied to clipboard",
      )
    })

    test("should show assistant message model and token count", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.chatMessageRunGet = async () => [
        {
          ...messageRun,
          status: "completed",
          assistantMessages: [
            {
              id: "am-meta",
              messageRunId: "mr1",
              role: "assistant",
              content: "I'm good, thank you!",
              createdAt: Date.now(),
              tokenCount: 19,
              tools: [],
            },
          ],
          modelMeta: {
            ...messageRun.modelMeta,
            name: "gpt-4.1",
          },
        },
      ]

      await sidepanelPage.page.reload()

      const assistantMessage =
        sidepanelPage.page.getByTestId("assistant-message")

      await expect(
        assistantMessage.getByTestId("assistant-message-model"),
      ).toHaveText("gpt-4.1")
      await expect(
        assistantMessage.getByTestId("assistant-message-tokens"),
      ).toHaveText("19 tok")
    })

    test("should render assistant markdown with code blocks, links, tables, headers, and lists", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.chatMessageRunGet = async () => [
        {
          ...messageRun,
          status: "completed",
          assistantMessages: [
            {
              id: "am-markdown",
              messageRunId: "mr1",
              role: "assistant",
              content: [
                "# Markdown Demo",
                "",
                "## Links",
                "[Example link](https://example.com)",
                "",
                "## Code Blocks",
                "",
                "```typescript",
                "function greet(name: string): string {",
                "  return `Hello, ${name}!`;",
                "}",
                "",
                'console.log(greet("World"))',
                "```",
                "",
                "## Tables",
                "",
                "| Feature | Status |",
                "| --- | --- |",
                "| Markdown | Working |",
                "| Tables | Working |",
                "",
                "## Lists",
                "",
                "- Item 1",
                "- Item 2",
                "",
                "1. First",
                "2. Second",
              ].join("\n"),
              createdAt: Date.now(),
              tokenCount: 128,
              tools: [],
            },
          ],
        },
      ]

      await sidepanelPage.page.reload()

      const contentBlock = sidepanelPage.page
        .getByTestId("assistant-message")
        .getByTestId("assistant-content")

      await expect(
        contentBlock.getByRole("heading", { level: 1, name: "Markdown Demo" }),
      ).toBeVisible()
      await expect(
        contentBlock.getByRole("heading", { level: 2, name: "Links" }),
      ).toBeVisible()
      await expect(
        contentBlock.getByRole("link", { name: "Example link" }),
      ).toHaveAttribute("href", "https://example.com")
      await expect(
        contentBlock.getByRole("heading", { level: 2, name: "Code Blocks" }),
      ).toBeVisible()
      await expect(
        contentBlock.getByRole("button", { name: "Copy code" }),
      ).toBeVisible()
      await expect(
        contentBlock.getByText('console.log(greet("World"))'),
      ).toBeVisible()
      await expect(
        contentBlock.getByRole("heading", { level: 2, name: "Tables" }),
      ).toBeVisible()
      await expect(contentBlock.getByRole("table")).toBeVisible()
      await expect(
        contentBlock.getByRole("heading", { level: 2, name: "Lists" }),
      ).toBeVisible()
      await expect(contentBlock.getByText("Item 1")).toBeVisible()
      await expect(contentBlock.getByText("First")).toBeVisible()
    })
  })
})
