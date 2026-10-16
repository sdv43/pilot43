import type { Tool } from "@pilot43/agent"

import { isProbablyReaderable, Readability } from "@mozilla/readability"
import { defaultFetchTimeoutMs } from "@pilot43/agent"
import {
  getOptionalNonEmptyString,
  parseHttpUrl,
  truncateToolText,
} from "@pilot43/agent"

import {
  maxReadabilityContentCharacters,
  maxReadabilityTextCharacters,
} from "./const"

function ensureDocumentBaseHref(document: Document, baseUrl: string) {
  const htmlElement = document.documentElement
  if (!htmlElement) {
    return
  }

  const head = document.head ?? document.createElement("head")
  if (!document.head) {
    htmlElement.insertBefore(head, htmlElement.firstChild)
  }

  const baseElement =
    head.querySelector("base") ?? document.createElement("base")
  baseElement.setAttribute("href", baseUrl)
  if (!baseElement.parentElement) {
    head.prepend(baseElement)
  }
}

async function fetchReadableHtml(parsedUrl: URL): Promise<{
  contentType: null | string
  html: string
  ok: boolean
  redirected: boolean
  status: number
  statusText: string
  url: string
}> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, defaultFetchTimeoutMs)

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      signal: controller.signal,
    })

    return {
      contentType: response.headers.get("content-type"),
      html: await response.text(),
      ok: response.ok,
      redirected: response.redirected,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function executeReadWebpageTool(
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const html = getOptionalNonEmptyString(args, "html")
  const url = getOptionalNonEmptyString(args, "url")

  if (!html && !url) {
    throw new Error("Provide either `url` or `html`.")
  }

  const parsedUrl = url ? parseHttpUrl(url, "url") : null
  let responseMetadata: null | {
    contentType: null | string
    html: string
    ok: boolean
    redirected: boolean
    status: number
    statusText: string
    url: string
  } = null

  let sourceHtml = html
  let sourceUrl = parsedUrl?.toString() ?? null

  if (!sourceHtml && parsedUrl) {
    responseMetadata = await fetchReadableHtml(parsedUrl)
    sourceHtml = responseMetadata.html
    sourceUrl = responseMetadata.url
  }

  if (!sourceHtml?.trim()) {
    throw new Error("The provided input did not contain any HTML to parse.")
  }

  const document = new DOMParser().parseFromString(sourceHtml, "text/html")
  if (sourceUrl) {
    ensureDocumentBaseHref(document, sourceUrl)
  }

  const readerable = isProbablyReaderable(document)
  const article = new Readability(document).parse()

  if (!article) {
    throw new Error(
      readerable
        ? "Readability could not extract article content from the provided input."
        : "The provided input does not appear to contain a readable article.",
    )
  }

  truncateToolText(article.content, maxReadabilityContentCharacters)
  const textContent = truncateToolText(
    article.textContent,
    maxReadabilityTextCharacters,
  )

  return {
    excerpt: article.excerpt,
    source: html ? "html" : "url",
    textContent: textContent.value,
    title: article.title,
    url: sourceUrl,
    ...(responseMetadata
      ? {
          ok: responseMetadata.ok,
          status: responseMetadata.status,
        }
      : {}),
  }
}

export const readWebpageTool: Tool = {
  definition: {
    id: "read_webpage",
    name: "read_webpage",
    shortDescription: "Extract readable article content from a web page.",
    description:
      "Fetch a web page by URL or parse provided HTML through Mozilla Readability and return the extracted article: title, byline, excerpt, lang, dir, siteName, publishedTime, length, textContent (truncated to 30000 chars), and cleaned HTML content (truncated to 30000 chars), each with a `truncated` flag when cut. Provide either `url` (http/https, fetched with a 10s timeout) or `html` (parsed directly). If both are given, html is parsed and url is used as the base URL for resolving relative links. When `url` is fetched, response status/ok/redirected are included. Throws if neither input yields HTML or the page is not readerable.",
  },
  inputSchema: {
    additionalProperties: false,
    properties: {
      html: {
        description:
          "Optional raw HTML to parse directly. Provide either html or url. If both are provided, html is parsed and url is used as the source URL.",
        type: "string",
      },
      url: {
        description:
          "Optional absolute http or https URL to fetch and parse. Provide either url or html.",
        type: "string",
      },
    },
    required: [],
    type: "object",
  },
  execute: (args) => executeReadWebpageTool(args),
}
