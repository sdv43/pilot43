import { expect, test } from "../fixtures"
import {
  callBackend,
  startFakeOpenAIServer,
  waitForMessageRunStatus,
} from "./utils/backend"

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
      titleGenerationModel: "disabled",
    })

    expect(
      (await callBackend(page, "modelToolGet")).map((tool) => tool.name),
    ).toEqual(["fetch", "read_webpage", "run_js", "generate_file"])

    const command = await callBackend(page, "commandCreate", {
      description: "Description",
      name: "backend",
      prompt: "Prompt",
    })
    expect(
      (await callBackend(page, "commandGet")).map((entry) => entry.id),
    ).toContain(command.id)

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
        maxRequestPerMinute: 40,
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
})
