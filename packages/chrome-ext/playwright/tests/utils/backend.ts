import type { BackendApi, MessageRun, PageContextApi } from "@pilot43/protocol"

/** Operations served over Chrome runtime messaging. */
type MessagingApi = BackendApi & PageContextApi

import { type Page } from "@playwright/test"
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http"

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
  let run: MessageRun | undefined

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const runs = await callBackend(p, "chatMessageRunGet", chatId)
    run = runs.at(-1)

    if (run?.status === status) {
      return run
    }

    await p.waitForTimeout(100)
  }

  throw new Error(
    `The message run did not reach the "${status}" status: ${JSON.stringify(run)}`,
  )
}

export type FakeCompletionChunk = (
  | { content: string }
  | { toolCalls: { arguments: unknown; id: string; name: string }[] }
) & {
  /** Delay before the response is sent, to keep the run generating. */
  delayMs?: number
}

export interface FakeOpenAIServer {
  close: () => Promise<void>
  host: string
  /** Bodies of the chat completion requests received so far, except title requests. */
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

  const server = await listen((req, res) => {
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

      const request = JSON.parse(body) as FakeOpenAIServer["requests"][number]
      const isTitleRequest = request.messages.some(
        (message) =>
          typeof message.content === "string" &&
          message.content.startsWith("Generate a concise chat title"),
      )

      // Chat titles are generated with the chat model; they don't consume
      // the scripted responses.
      if (!isTitleRequest) {
        requests.push(request)
      }

      const response: FakeCompletionChunk = isTitleRequest
        ? { content: "Fake title" }
        : (responses[requests.length - 1] ?? { content: "" })
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

      setTimeout(() => {
        if (res.destroyed) {
          return
        }

        res.writeHead(200, { "content-type": "text/event-stream" })
        res.end(
          `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
        )
      }, response.delayMs ?? 0)
    })
  })

  return { close: server.close, host: server.origin, requests }
}

/** Starts an http server on a free local port. */
async function listen(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<{ close: () => Promise<void>; origin: string }> {
  const server: Server = createServer(handler)

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve)
  })

  const { port } = server.address() as { port: number }

  return {
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections()
        server.close(() => {
          resolve()
        })
      }),
    origin: `http://127.0.0.1:${port}`,
  }
}

/** Serves fixed responses by path, e.g. web pages for the content script. */
export async function startStaticServer(
  routes: Record<string, { body: string; contentType?: string }>,
) {
  return await listen((req, res) => {
    const route = routes[new URL(req.url ?? "/", "http://localhost").pathname]

    if (!route) {
      res.writeHead(404).end()
      return
    }

    res.writeHead(200, {
      "content-type": route.contentType ?? "text/html; charset=utf-8",
    })
    res.end(route.body)
  })
}

export interface FakeMcpTool {
  description: string
  name: string
  /** Text returned by a call, built from its arguments. */
  run: (args: Record<string, unknown>) => string
}

/**
 * Starts a minimal MCP server over streamable HTTP that answers with plain
 * JSON responses and records the tool calls it receives.
 */
export async function startFakeMcpServer(tools: FakeMcpTool[]) {
  const calls: { arguments: Record<string, unknown>; name: string }[] = []

  const server = await listen((req, res) => {
    if (req.method !== "POST") {
      // No server-initiated stream.
      res.writeHead(405).end()
      return
    }

    let body = ""

    req.on("data", (part: Buffer) => {
      body += part.toString()
    })

    req.on("end", () => {
      const message = JSON.parse(body) as {
        id?: number | string
        method: string
        params?: { arguments?: Record<string, unknown>; name?: string }
      }

      // Notifications get no response.
      if (message.id === undefined) {
        res.writeHead(202).end()
        return
      }

      let result: unknown

      switch (message.method) {
        case "initialize":
          result = {
            capabilities: { tools: {} },
            protocolVersion: "2025-03-26",
            serverInfo: { name: "fake-mcp", version: "1.0.0" },
          }
          break
        case "tools/list":
          result = {
            tools: tools.map((tool) => ({
              description: tool.description,
              inputSchema: { properties: {}, type: "object" },
              name: tool.name,
            })),
          }
          break
        case "tools/call": {
          const name = message.params?.name ?? ""
          const args = message.params?.arguments ?? {}
          const tool = tools.find((item) => item.name === name)

          calls.push({ arguments: args, name })
          result = {
            content: [{ text: tool ? tool.run(args) : "", type: "text" }],
            isError: !tool,
          }
          break
        }
        default:
          result = {}
      }

      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({ id: message.id, jsonrpc: "2.0", result }))
    })
  })

  return { ...server, calls, url: `${server.origin}/mcp` }
}

/** Html page with enough article text for Readability to extract it. */
export function createArticlePage(title: string, paragraph: string) {
  const paragraphs = Array.from(
    { length: 6 },
    (_, index) =>
      `<p>${paragraph} Section ${index + 1} explains the topic in more detail, with practical advice, examples and a few common mistakes to avoid when you start out.</p>`,
  ).join("")

  return `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="${title} description"></head><body><article><h1>${title}</h1>${paragraphs}</article></body></html>`
}
