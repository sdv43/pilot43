import type { Tool } from "../types"

import { defaultFetchTimeoutMs, maxFetchResponseCharacters } from "../const"
import { isPlainObject } from "./shared"

function normalizeHeaders(value: unknown): Record<string, string> | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isPlainObject(value)) {
    throw new Error("Parameter `headers` must be an object.")
  }

  const headers: Record<string, string> = {}

  Object.entries(value).forEach(([key, headerValue]) => {
    if (
      typeof headerValue !== "boolean" &&
      typeof headerValue !== "number" &&
      typeof headerValue !== "string"
    ) {
      throw new Error(`Header \`${key}\` must be a string, number, or boolean.`)
    }

    headers[key] = String(headerValue)
  })

  return headers
}

async function readResponseBodyPreview(response: Response) {
  if (!response.body) {
    return { bodyText: "", truncated: false }
  }

  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let bodyText = ""
  let truncated = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        bodyText += decoder.decode()
        break
      }

      bodyText += decoder.decode(value, { stream: true })
      if (bodyText.length > maxFetchResponseCharacters) {
        bodyText = bodyText.slice(0, maxFetchResponseCharacters)
        truncated = true
        await reader.cancel()
        break
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { bodyText, truncated }
}

export async function executeFetchTool(
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = args.url
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Parameter `url` must be a non-empty string.")
  }

  const parsedUrl = new URL(url)
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https URLs are supported.")
  }

  const method =
    typeof args.method === "string" && args.method.trim()
      ? args.method.toUpperCase()
      : "GET"
  const requestBody = typeof args.body === "string" ? args.body : undefined
  if (args.body !== undefined && requestBody === undefined) {
    throw new Error("Parameter `body` must be a string.")
  }

  if ((method === "GET" || method === "HEAD") && requestBody !== undefined) {
    throw new Error(`${method} requests cannot include a body.`)
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, defaultFetchTimeoutMs)

  try {
    const response = await fetch(parsedUrl.toString(), {
      body: requestBody,
      headers: normalizeHeaders(args.headers),
      method,
      signal: controller.signal,
    })
    const { bodyText } = await readResponseBodyPreview(response)

    return {
      bodyText,
      ok: response.ok,
      status: response.status,
      url: response.url,
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const fetchTool: Tool = {
  definition: {
    id: "fetch",
    name: "fetch",
    shortDescription: "Make an HTTP request and read the response.",
    description:
      "Make an HTTP request to an absolute http or https URL and return the response. Returns status, statusText, ok, redirected, final url, response headers, content-type, and the response body text (truncated to 50000 characters, with a `truncated` flag when cut). The request times out after 10 seconds. GET/HEAD cannot include a body. Use `method` to set the verb (defaults to GET, uppercased), `headers` for request headers as a JSON object, and `body` for the request body on non-GET requests.",
  },
  inputSchema: {
    additionalProperties: false,
    properties: {
      body: {
        description: "Optional request body for non-GET requests",
        type: "string",
      },
      headers: {
        description: "Optional request headers as a JSON object",
        type: "object",
      },
      method: {
        description: "HTTP method to use. Defaults to GET.",
        type: "string",
      },
      url: {
        description: "Absolute http or https URL to request",
        type: "string",
      },
    },
    required: ["url"],
    type: "object",
  },
  execute: (args) => executeFetchTool(args),
}
