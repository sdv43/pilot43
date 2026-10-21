import type { BrowserContext } from "@playwright/test"
import type { ChatSettings, MessageRun, Workspace } from "@pilot43/protocol"
import { expect, test } from "../fixtures"
import {
  getMessageEditor,
  getSendMessageButton,
  getToolGroupSwitch,
  getToolsButton,
  openToolsPopover,
  selectModel,
} from "./utils/footer"
import {
  callBackend,
  createArticlePage,
  type FakeOpenAIServer,
  startFakeMcpServer,
  startFakeOpenAIServer,
  startStaticServer,
  waitForMessageRunStatus,
} from "./utils/backend"

async function openExtensionPage(context: BrowserContext, extensionId: string) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)
  return page
}

/** Content of the assistant replies of a run. */
function getReplies(run: MessageRun) {
  return run.assistantMessages.map((message) => message.content)
}

/**
 * Creates a provider for the fake model server and a workspace, then sends
 * `content` to a new chat of the workspace.
 */
async function startChat(
  page: Awaited<ReturnType<typeof openExtensionPage>>,
  server: FakeOpenAIServer,
  options: {
    content?: string
    initialSettings?: ChatSettings
    workspace?: Partial<Omit<Workspace, "id" | "lastSelectedChatId">>
  } = {},
) {
  const provider = await callBackend(page, "modelProviderCreate", {
    name: "Fake",
    settings: { apiKey: "key", host: server.host },
    type: "openai",
  })
  const workspace = await callBackend(page, "workspaceCreate", {
    name: "Loop",
    ...options.workspace,
  })
  const { chatId } = await callBackend(
    page,
    "chatMessageSend",
    "",
    {
      attachmentReferences: [],
      attachments: [],
      content: options.content ?? "Go",
    },
    { name: "fake-model", providerId: provider.id },
    workspace.id,
    options.initialSettings,
  )

  return { chatId, provider, workspace }
}

// These tests run against the real offscreen backend (agent + IndexedDB)
// instead of the mocked api client used by the UI tests.
test.describe("Backend", () => {
  test("serves the api from the offscreen document", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)

    const workspace = await callBackend(page, "workspaceCreate", {
      name: "Backend",
    })
    expect(
      (await callBackend(page, "workspaceGet")).map((entry) => entry.id),
    ).toContain(workspace.id)

    expect(await callBackend(page, "appSettingsGet")).toMatchObject({
      id: "app",
      mcpServers: [],
    })

    expect(
      (await callBackend(page, "modelToolGet")).map((tool) => tool.name),
    ).toEqual(["fetch", "read_webpage", "run_js", "generate_file"])

    const prompt = await callBackend(page, "promptCreate", {
      text: "Prompt",
      title: "Backend",
    })
    expect(
      (await callBackend(page, "promptGet")).map((entry) => entry.id),
    ).toContain(prompt.id)

    expect(await callBackend(page, "chatTokenEstimateGet", null)).toBeNull()
  })

  test("runs tools, pauses for a follow-up question and resumes", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([
      {
        toolCalls: [
          {
            arguments: { code: "return 6 * 7" },
            id: "call-js",
            name: "run_js",
          },
          {
            arguments: { follow_up: [{ text: "Yes" }], question: "Proceed?" },
            id: "call-ask",
            name: "ask_followup_question",
          },
        ],
      },
      { content: "All done." },
    ])

    try {
      const page = await context.newPage()
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)

      const provider = await callBackend(page, "modelProviderCreate", {
        name: "Fake",
        settings: { apiKey: "key", host: server.host },
        type: "openai",
      })
      const workspace = await callBackend(page, "workspaceCreate", {
        name: "Loop",
      })

      await callBackend(
        page,
        "chatMessageSend",
        "",
        { attachmentReferences: [], attachments: [], content: "Compute" },
        { name: "fake-model", providerId: provider.id },
        workspace.id,
      )
      const [chat] = await callBackend(page, "chatGetByWorkspace", workspace.id)

      const waiting = await waitForMessageRunStatus(
        page,
        chat.id,
        "awaiting_input",
      )
      expect(waiting.followupQuestion?.question).toBe("Proceed?")
      // The sequential question runs before the parallel `run_js` call.
      expect(waiting.assistantMessages).toEqual([
        expect.objectContaining({
          tools: [
            expect.objectContaining({
              name: "ask_followup_question",
              result: { awaitingInput: true, ok: true, question: "Proceed?" },
            }),
          ],
        }),
      ])

      await callBackend(page, "chatMessageRunAnswer", waiting.id, "Yes")
      const completed = await waitForMessageRunStatus(
        page,
        chat.id,
        "completed",
      )

      const [toolMessage, answer, reply] = completed.assistantMessages
      expect([toolMessage.role, answer.role, reply.role]).toEqual([
        "assistant",
        "user_answer",
        "assistant",
      ])
      expect(
        toolMessage.role === "assistant" &&
          toolMessage.tools.map((tool) => [tool.name, tool.result]),
      ).toEqual([
        [
          "ask_followup_question",
          { awaitingInput: true, ok: true, question: "Proceed?" },
        ],
        ["run_js", expect.objectContaining({ ok: true, value: 42 })],
      ])
      expect(answer.content).toBe("Yes")
      expect(reply.content).toBe("All done.")

      // The next request carries the tool results followed by the answer.
      const { messages } = server.requests[1]
      expect(messages[0].role).toBe("system")
      expect(messages.slice(-4).map((message) => message.role)).toEqual([
        "assistant",
        "tool",
        "tool",
        "user",
      ])
      expect(messages.at(-1)?.content).toBe("Yes")
      expect(messages.at(-2)?.content).toContain("42")
    } finally {
      await server.close()
    }
  })

  test("fetches urls and reads web pages", async ({ context, extensionId }) => {
    const site = await startStaticServer({
      "/article": {
        body: createArticlePage(
          "Kitchen Garden Guide",
          "Growing herbs on a windowsill needs light, water and patience.",
        ),
      },
      "/data.json": {
        body: JSON.stringify({ answer: 42 }),
        contentType: "application/json",
      },
    })
    const server = await startFakeOpenAIServer([
      {
        toolCalls: [
          {
            arguments: { url: `${site.origin}/data.json` },
            id: "call-fetch",
            name: "fetch",
          },
          {
            arguments: { url: `${site.origin}/article` },
            id: "call-read",
            name: "read_webpage",
          },
        ],
      },
      { content: "Read both." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId } = await startChat(page, server)
      const run = await waitForMessageRunStatus(page, chatId, "completed")
      const [toolMessage] = run.assistantMessages
      const results = Object.fromEntries(
        (toolMessage.role === "assistant" ? toolMessage.tools : []).map(
          (tool) => [tool.name, tool.result],
        ),
      )

      expect(results.fetch).toMatchObject({
        bodyText: '{"answer":42}',
        ok: true,
        status: 200,
      })
      expect(results.read_webpage).toMatchObject({
        title: "Kitchen Garden Guide",
        textContent: expect.stringContaining(
          "Growing herbs on a windowsill needs light",
        ),
      })
      // Both results are sent back to the model.
      const toolMessages = server.requests[1].messages.filter(
        (message) => message.role === "tool",
      )
      expect(toolMessages).toHaveLength(2)
      expect(JSON.stringify(toolMessages)).toContain("Kitchen Garden Guide")
    } finally {
      await server.close()
      await site.close()
    }
  })

  test("generates a file that can be downloaded later", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([
      {
        toolCalls: [
          {
            arguments: {
              content: "# Report\nAll good.",
              filename: "report.md",
            },
            id: "call-file",
            name: "generate_file",
          },
        ],
      },
      { content: "Here is the report." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId } = await startChat(page, server)
      const run = await waitForMessageRunStatus(page, chatId, "completed")
      const [toolMessage] = run.assistantMessages
      const [tool] = toolMessage.role === "assistant" ? toolMessage.tools : []

      expect(tool.result).toMatchObject({
        filename: "report.md",
        lines: 2,
        mimeType: "text/markdown",
        ok: true,
      })

      const fileId = (tool.result as { fileId: string }).fileId
      expect(await callBackend(page, "generatedFileGet", fileId)).toMatchObject(
        { content: "# Report\nAll good.", filename: "report.md" },
      )
    } finally {
      await server.close()
    }
  })

  test("keeps the todo list on the chat until it is cleared", async ({
    context,
    extensionId,
  }) => {
    const todos = "[x] Plan\n[-] Build\n[ ] Ship"
    const server = await startFakeOpenAIServer([
      {
        toolCalls: [
          { arguments: { todos }, id: "call-todo", name: "update_todo_list" },
        ],
      },
      { content: "Working on it." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId, workspace } = await startChat(page, server)
      await waitForMessageRunStatus(page, chatId, "completed")

      const getChat = async () =>
        (await callBackend(page, "chatGetByWorkspace", workspace.id)).find(
          (chat) => chat.id === chatId,
        )

      expect((await getChat())?.todoList).toBe(todos)

      await callBackend(page, "chatTodoListClear", chatId)

      expect((await getChat())?.todoList).toBeFalsy()
    } finally {
      await server.close()
    }
  })

  test("runs a tool after it is allowed once", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([
      {
        toolCalls: [
          {
            arguments: { code: "return 6 * 7" },
            id: "call-js",
            name: "run_js",
          },
        ],
      },
      { content: "Done." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId } = await startChat(page, server, {
        workspace: {
          toolPermissions: {
            builtin: { level: "allow", tools: { run_js: "ask" } },
          },
        },
      })

      const waiting = await waitForMessageRunStatus(
        page,
        chatId,
        "awaiting_input",
      )
      expect(waiting.toolApproval).toEqual({
        toolCallId: "call-js",
        toolName: "run_js",
      })
      // The tool waits for the answer before it runs.
      expect(server.requests).toHaveLength(1)

      await callBackend(page, "chatMessageRunAnswer", waiting.id, "allow_once")
      const completed = await waitForMessageRunStatus(page, chatId, "completed")
      const [toolMessage] = completed.assistantMessages

      expect(completed.toolApproval).toBeNull()
      expect(toolMessage.role === "assistant" && toolMessage.tools).toEqual([
        expect.objectContaining({
          approval: "approved",
          name: "run_js",
          result: expect.objectContaining({ ok: true, value: 42 }),
        }),
      ])
    } finally {
      await server.close()
    }
  })

  test("reports a denied tool call to the model", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([
      {
        toolCalls: [
          { arguments: { code: "return 1" }, id: "call-js", name: "run_js" },
        ],
      },
      { content: "Okay, I won't." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId } = await startChat(page, server, {
        workspace: { toolPermissions: { builtin: { level: "ask" } } },
      })

      const waiting = await waitForMessageRunStatus(
        page,
        chatId,
        "awaiting_input",
      )
      await callBackend(page, "chatMessageRunAnswer", waiting.id, "deny")
      const completed = await waitForMessageRunStatus(page, chatId, "completed")
      const [toolMessage] = completed.assistantMessages

      expect(toolMessage.role === "assistant" && toolMessage.tools).toEqual([
        expect.objectContaining({
          name: "run_js",
          result: { error: "The user denied this tool call.", ok: false },
          status: "denied",
        }),
      ])
      expect(
        server.requests[1].messages.find((message) => message.role === "tool")
          ?.content,
      ).toContain("The user denied this tool call.")
    } finally {
      await server.close()
    }
  })

  test("runs MCP tools and always allows them once approved", async ({
    context,
    extensionId,
  }) => {
    const mcp = await startFakeMcpServer([
      {
        description: "Echoes the text",
        name: "echo",
        run: (args) => `echo: ${String(args.text)}`,
      },
    ])
    const echoCall = (id: string) => ({
      toolCalls: [{ arguments: { text: id }, id, name: "mcp__docs__echo" }],
    })
    const server = await startFakeOpenAIServer([
      echoCall("first"),
      { content: "Echoed once." },
      echoCall("second"),
      { content: "Echoed twice." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      await callBackend(page, "mcpServerUpdate", [
        { name: "docs", type: "http", url: mcp.url },
      ])
      const { chatId, provider, workspace } = await startChat(page, server, {
        initialSettings: { tools: [{ enabled: true, name: "mcp__docs" }] },
        workspace: { mcpServers: ["docs"] },
      })

      // MCP tools ask first by default.
      const waiting = await waitForMessageRunStatus(
        page,
        chatId,
        "awaiting_input",
      )
      expect(waiting.toolApproval).toEqual({
        server: "docs",
        toolCallId: "first",
        toolName: "mcp__docs__echo",
      })
      expect(
        server.requests[0].tools?.map((tool) => tool.function.name),
      ).toContain("mcp__docs__echo")

      await callBackend(
        page,
        "chatMessageRunAnswer",
        waiting.id,
        "always_allow",
      )
      await waitForMessageRunStatus(page, chatId, "completed")

      const [savedWorkspace] = (await callBackend(page, "workspaceGet")).filter(
        (item) => item.id === workspace.id,
      )
      expect(savedWorkspace.toolPermissions).toEqual({
        mcp: { docs: { level: "ask", tools: { mcp__docs__echo: "allow" } } },
      })

      // The next call runs without asking.
      await callBackend(
        page,
        "chatMessageSend",
        chatId,
        { attachmentReferences: [], attachments: [], content: "Again" },
        { name: "fake-model", providerId: provider.id },
        workspace.id,
      )
      await expect
        .poll(async () => {
          const runs = await callBackend(page, "chatMessageRunGet", chatId)
          return runs.at(-1)?.status
        })
        .toBe("completed")

      expect(mcp.calls).toEqual([
        { arguments: { text: "first" }, name: "echo" },
        { arguments: { text: "second" }, name: "echo" },
      ])
      const runs = await callBackend(page, "chatMessageRunGet", chatId)
      const [toolMessage] = runs[1].assistantMessages
      expect(toolMessage.role === "assistant" && toolMessage.tools).toEqual([
        expect.objectContaining({
          approval: "allowed",
          name: "mcp__docs__echo",
          result: expect.anything(),
        }),
      ])
      expect(JSON.stringify(toolMessage)).toContain("echo: second")
    } finally {
      await server.close()
      await mcp.close()
    }
  })

  test("does not offer tools disabled in the workspace", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([{ content: "Hi." }])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId } = await startChat(page, server, {
        workspace: {
          toolPermissions: {
            builtin: { level: "allow", tools: { fetch: "disabled" } },
          },
        },
      })
      await waitForMessageRunStatus(page, chatId, "completed")

      const offered = server.requests[0].tools?.map(
        (tool) => tool.function.name,
      )
      expect(offered).toContain("run_js")
      expect(offered).not.toContain("fetch")
    } finally {
      await server.close()
    }
  })

  test("stops a generating run", async ({ context, extensionId }) => {
    const server = await startFakeOpenAIServer([
      { content: "Too late.", delayMs: 10_000 },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId, workspace } = await startChat(page, server)
      const running = await waitForMessageRunStatus(page, chatId, "running")

      await callBackend(page, "chatMessageRunStop", running.id)
      const stopped = await waitForMessageRunStatus(page, chatId, "stopped")

      expect(getReplies(stopped).join("")).not.toContain("Too late.")
      const [chat] = await callBackend(page, "chatGetByWorkspace", workspace.id)
      expect(chat.isGenerating).toBeFalsy()
    } finally {
      await server.close()
    }
  })

  test("stops a run whose MCP tool call never returns", async ({
    context,
    extensionId,
  }) => {
    const mcp = await startFakeMcpServer([
      { description: "Hangs", hang: true, name: "use_figma", run: () => "" },
    ])
    const server = await startFakeOpenAIServer([
      {
        toolCalls: [
          { arguments: {}, id: "call-1", name: "mcp__figma__use_figma" },
        ],
      },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      await callBackend(page, "mcpServerUpdate", [
        { name: "figma", type: "http", url: mcp.url },
      ])
      const { chatId, workspace } = await startChat(page, server, {
        initialSettings: { tools: [{ enabled: true, name: "mcp__figma" }] },
        workspace: {
          mcpServers: ["figma"],
          toolPermissions: { mcp: { figma: { level: "allow" } } },
        },
      })

      await expect.poll(() => mcp.calls.length).toBe(1)
      const [running] = await callBackend(page, "chatMessageRunGet", chatId)
      await callBackend(page, "chatMessageRunStop", running.id)

      // The history spinner goes away although the call never returned.
      const [chat] = await callBackend(page, "chatGetByWorkspace", workspace.id)
      expect(chat.isGenerating).toBe(false)
      const stopped = await waitForMessageRunStatus(page, chatId, "stopped")
      expect(stopped.assistantMessages[0]).toMatchObject({
        tools: [{ status: "failed" }],
      })
    } finally {
      await server.close()
      await mcp.close()
    }
  })

  test("keeps an MCP server switched on after the first message creates the chat", async ({
    context,
    extensionId,
  }) => {
    const mcp = await startFakeMcpServer([
      { description: "Echoes", name: "echo", run: () => "ok" },
    ])
    const server = await startFakeOpenAIServer([
      { content: "Done.", delayMs: 5_000 },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      await callBackend(page, "modelProviderCreate", {
        name: "Fake",
        settings: { apiKey: "key", host: server.host },
        type: "openai",
      })
      await callBackend(page, "mcpServerUpdate", [
        { name: "figma", type: "http", url: mcp.url },
      ])
      const workspace = await callBackend(page, "workspaceCreate", {
        name: "Switches",
      })
      await page.goto(
        `chrome-extension://${extensionId}/sidepanel.html#/w/${workspace.id}`,
      )
      await page.reload()

      await openToolsPopover(page)
      await getToolGroupSwitch(page, "figma").check()
      await page.keyboard.press("Escape")
      await getMessageEditor(page).fill("Check the Figma connection")
      await selectModel(page, "fake-model")
      await getSendMessageButton(page).click()

      await expect(page).toHaveURL(/#\/w\/[^/]+\/c\//)
      const [chat] = await callBackend(page, "chatGetByWorkspace", workspace.id)
      expect(chat.settings.tools).toContainEqual({
        enabled: true,
        name: "mcp__figma",
      })
      // The switch shows the stored settings of the new chat, not defaults.
      await page.waitForTimeout(500)
      await expect(getToolsButton(page)).toContainText("1 server")
    } finally {
      await server.close()
      await mcp.close()
    }
  })

  test("regenerates a run with a new reply", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([
      { content: "First reply." },
      { content: "Second reply." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId } = await startChat(page, server)
      const first = await waitForMessageRunStatus(page, chatId, "completed")

      expect(getReplies(first)).toEqual(["First reply."])

      await callBackend(page, "chatMessageRunRetry", first.id)

      await expect
        .poll(async () =>
          (await callBackend(page, "chatMessageRunGet", chatId)).map((run) => [
            run.id,
            run.status,
            getReplies(run),
          ]),
        )
        .toEqual([[first.id, "completed", ["Second reply."]]])
      // The retried request replays the same user message.
      expect(server.requests[1].messages.at(-1)).toMatchObject({
        content: expect.stringContaining("Go"),
        role: "user",
      })
    } finally {
      await server.close()
    }
  })

  test("rolls the history back to a run", async ({ context, extensionId }) => {
    const server = await startFakeOpenAIServer([
      { content: "One." },
      { content: "Two." },
      { content: "Three after rollback." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const { chatId, provider, workspace } = await startChat(page, server, {
        content: "First",
      })
      const first = await waitForMessageRunStatus(page, chatId, "completed")
      const send = (content: string) =>
        callBackend(
          page,
          "chatMessageSend",
          chatId,
          { attachmentReferences: [], attachments: [], content },
          { name: "fake-model", providerId: provider.id },
          workspace.id,
        )

      await send("Second")
      await expect
        .poll(async () =>
          (await callBackend(page, "chatMessageRunGet", chatId)).map(
            (run) => run.status,
          ),
        )
        .toEqual(["completed", "completed"])

      await callBackend(page, "chatMessageRunDeleteAfter", first.id)

      const runs = await callBackend(page, "chatMessageRunGet", chatId)
      expect(runs.map((run) => run.userMessage.content)).toEqual(["First"])

      // The next message continues from the kept run only.
      await send("Third")
      await expect
        .poll(async () =>
          (await callBackend(page, "chatMessageRunGet", chatId)).map(
            (run) => run.status,
          ),
        )
        .toEqual(["completed", "completed"])
      expect(
        server.requests[2].messages
          .filter((message) => message.role !== "system")
          .map((message) => message.content),
      ).toEqual([
        expect.stringContaining("First"),
        "One.",
        expect.stringContaining("Third"),
      ])
    } finally {
      await server.close()
    }
  })

  test("deletes chats past the retention period when the backend starts", async ({
    context,
    extensionId,
  }) => {
    const server = await startFakeOpenAIServer([
      { content: "Old." },
      { content: "Pinned." },
      { content: "Fresh." },
    ])

    try {
      const page = await openExtensionPage(context, extensionId)
      const {
        chatId: oldChatId,
        provider,
        workspace,
      } = await startChat(page, server, { content: "Old chat" })
      await waitForMessageRunStatus(page, oldChatId, "completed")

      const createChat = async (content: string) => {
        const { chatId } = await callBackend(
          page,
          "chatMessageSend",
          "",
          { attachmentReferences: [], attachments: [], content },
          { name: "fake-model", providerId: provider.id },
          workspace.id,
        )
        await waitForMessageRunStatus(page, chatId, "completed")
        return chatId
      }
      const pinnedChatId = await createChat("Pinned chat")
      const freshChatId = await createChat("Fresh chat")

      await callBackend(page, "chatSettingsUpdate", pinnedChatId, {
        pinned: true,
        tools: [],
      })
      await callBackend(page, "appSettingsUpdate", {
        ...(await callBackend(page, "appSettingsGet")),
        chatRetentionDays: 30,
      })

      // Age two chats past the 30 days in the backend's database.
      await page.evaluate(
        async (chatIds) => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("pilot43")
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const store = db
            .transaction("chats", "readwrite")
            .objectStore("chats")
          const updatedAt = Date.now() - 40 * 24 * 60 * 60 * 1000

          await Promise.all(
            chatIds.map(
              (id) =>
                new Promise<void>((resolve, reject) => {
                  const get = store.get(id)
                  get.onsuccess = () => {
                    const put = store.put({ ...get.result, updatedAt })
                    put.onsuccess = () => resolve()
                    put.onerror = () => reject(put.error)
                  }
                }),
            ),
          )
          db.close()
        },
        [oldChatId, pinnedChatId],
      )

      // Restart the backend; opening the side panel recreates it.
      const [serviceWorker] = context.serviceWorkers()
      await serviceWorker.evaluate(() => chrome.offscreen.closeDocument())
      await page.reload()

      await expect
        .poll(async () =>
          (await callBackend(page, "chatGetByWorkspace", workspace.id))
            .map((chat) => chat.id)
            .sort(),
        )
        .toEqual([freshChatId, pinnedChatId].sort())
      expect(await callBackend(page, "chatMessageRunGet", oldChatId)).toEqual(
        [],
      )
    } finally {
      await server.close()
    }
  })
})
