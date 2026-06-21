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
  const startedAt = Date.now()

  try {
    const response = await fetch(parsedUrl.toString(), {
      body: requestBody,
      headers: normalizeHeaders(args.headers),
      method,
      signal: controller.signal,
    })
    const { bodyText, truncated } = await readResponseBodyPreview(response)
    const responseHeaders: Record<string, string> = {}

    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    return {
      bodyText,
      contentType: response.headers.get("content-type"),
      durationMs: Date.now() - startedAt,
      headers: responseHeaders,
      method,
      ok: response.ok,
      redirected: response.redirected,
      status: response.status,
      statusText: response.statusText,
      truncated,
      url: response.url,
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
