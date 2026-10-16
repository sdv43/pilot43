import type { BackendApi, MessageRun, PageContextApi } from "@pilot43/protocol"

/** Operations served over Chrome runtime messaging. */
type MessagingApi = BackendApi & PageContextApi

import { type Page } from "@playwright/test"
import { createServer } from "node:http"

/**
 * Calls the real offscreen backend from an extension page, retrying while the
 * offscreen document is still starting up.
 */
export async function callBackend<M extends keyof MessagingApi>(
  p: Page,
  action: M,
  ...payload: Parameters<MessagingApi[M]>
): Promise<Awaited<ReturnType<MessagingApi[M]>>> {
  const response = await p.evaluate(
    async ([action, payload]) => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
          return (await chrome.runtime.sendMessage({
            action,
            payload,
            target: "offscreen",
          })) as { error?: string; result: unknown }
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      throw new Error("The offscreen document did not respond.")
    },
    [action, payload] as const,
  )

  if (response.error) {
    throw new Error(response.error)
  }

  return response.result as Awaited<ReturnType<MessagingApi[M]>>
}

/**
 * Polls the chat's latest message run until it reaches `status`.
 */
export async function waitForMessageRunStatus(
  p: Page,
  chatId: string,
  status: MessageRun["status"],
): Promise<MessageRun> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const runs = await callBackend(p, "chatMessageRunGet", chatId)
    const run = runs.at(-1)

    if (run?.status === status) {
      return run
    }

    await p.waitForTimeout(100)
  }

  throw new Error(`The message run did not reach the "${status}" status.`)
}

export type FakeCompletionChunk =
  | { content: string }
  | { toolCalls: { arguments: unknown; id: string; name: string }[] }

export interface FakeOpenAIServer {
  close: () => Promise<void>
  host: string
  /** Bodies of the chat completion requests received so far. */
  requests: {
    messages: { content?: unknown; role: string }[]
    tools?: { function: { name: string } }[]
  }[]
}

/**
 * Starts an OpenAI-compatible server that streams one scripted response per
 * chat completion request, in order.
 */
export async function startFakeOpenAIServer(
  responses: FakeCompletionChunk[],
): Promise<FakeOpenAIServer> {
  const requests: FakeOpenAIServer["requests"] = []
  const base = {
    created: 1,
    id: "completion",
    model: "fake-model",
    object: "chat.completion.chunk",
  }

  const server = createServer((req, res) => {
    let body = ""

    req.on("data", (part: Buffer) => {
      body += part.toString()
    })

    req.on("end", () => {
      if (req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" })
        res.end(
          JSON.stringify({
            data: [{ id: "fake-model", object: "model" }],
            object: "list",
          }),
        )
        return
      }

      requests.push(JSON.parse(body) as FakeOpenAIServer["requests"][number])

      const response = responses[requests.length - 1] ?? { content: "" }
      const delta =
        "content" in response
          ? { content: response.content }
          : {
              tool_calls: response.toolCalls.map((toolCall, index) => ({
                function: {
                  arguments: JSON.stringify(toolCall.arguments),
                  name: toolCall.name,
                },
                id: toolCall.id,
                index,
                type: "function",
              })),
            }
      const chunks = [
        { ...base, choices: [{ delta, finish_reason: null, index: 0 }] },
        {
          ...base,
          choices: [
            {
              delta: {},
              finish_reason: "content" in response ? "stop" : "tool_calls",
              index: 0,
            },
          ],
        },
        {
          ...base,
          choices: [],
          usage: { completion_tokens: 5, prompt_tokens: 50, total_tokens: 55 },
        },
      ]

      res.writeHead(200, { "content-type": "text/event-stream" })
      res.end(
        `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
      )
    })
  })

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve)
  })

  const { port } = server.address() as { port: number }

  return {
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          resolve()
        })
      }),
    host: `http://127.0.0.1:${port}`,
    requests,
  }
}
