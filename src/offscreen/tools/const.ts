import type { RegisteredToolDefinition } from "./types"

export const defaultFetchTimeoutMs = 10000
export const maxFetchResponseCharacters = 50000
export const maxReadabilityContentCharacters = 30000
export const maxReadabilityTextCharacters = 30000
export const defaultRunJsTimeoutMs = 5000
export const maxRunJsTimeoutMs = 30000
export const minRunJsTimeoutMs = 100

/** Max characters accepted by a single `generate_file` call. */
export const maxGeneratedFileChunkCharacters = 200000
/** Max total characters a generated file may reach through append calls. */
export const maxGeneratedFileTotalCharacters = 1000000
/** Max characters of the filename, including the extension. */
export const maxGeneratedFileFilenameLength = 100
/** Characters of the file content kept in the tool result as a preview. */
export const generatedFilePreviewCharacters = 200

export const sandboxFrameId = "pilot43-run-js-sandbox"
export const sandboxPagePath = "sandbox.html"
export const sandboxResponseTimeoutPaddingMs = 1000
export const sandboxRequestType = "pilot43:run-js-request"
export const sandboxResponseType = "pilot43:run-js-response"
export const sandboxWorkerRequestType = "pilot43:run-js-worker-request"
export const sandboxWorkerResponseType = "pilot43:run-js-worker-response"
export const maxArrayEntries = 200
export const maxConsoleEntries = 200
export const maxObjectEntries = 200
export const maxStringLength = 8000

export const builtinToolDefinitions: RegisteredToolDefinition[] = [
  {
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
  },
  {
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
  },
  {
    definition: {
      id: "run_js",
      name: "run_js",
      shortDescription: "Run JavaScript in a sandbox and return the result.",
      description:
        "Execute arbitrary JavaScript in a sandboxed runtime and return the final value plus captured console output. Use a `return` statement to produce the result value. Runs in a Web Worker with no DOM and limited host APIs; only JSON-serializable values are returned (strings are truncated to 8000 chars, arrays/objects to 200 entries). The optional `timeout_ms` (clamped to 100-30000) overrides the default 5000ms timeout; on timeout the run is aborted and reported as an error. Returned logs are capped at 200 entries.",
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        code: {
          description:
            "JavaScript source code to execute. Use return to produce the final value.",
          type: "string",
        },
        timeout_ms: {
          description: "Optional timeout in milliseconds. Defaults to 3000.",
          type: "number",
        },
      },
      required: ["code"],
      type: "object",
    },
  },
  {
    definition: {
      id: "generate_file",
      name: "generate_file",
      shortDescription: "Generate a text file for the user to download.",
      description:
        'Generate a text file (md, txt, csv, json, html, xml, yaml, yml, log, svg) that the user can download from the chat. Use it whenever the user asks to create a file, save a document, or export data instead of pasting long content into the reply.\n\n`filename` is a plain file name with an allowed extension (no directories or path separators; sanitized automatically). `content` is the full text to write. `mode` is `"create"` (default) for a new file or `"append"` to continue an existing one; `append` requires `file_id` — the `fileId` returned by the earlier create call — and is the way to build files larger than 200000 characters: call repeatedly with chunks, then summarize.\n\nEach call returns only metadata (fileId, filename, mimeType, size, lines, preview) — never echo the content back. The total file size cannot exceed 1000000 characters.',
      defaultEnabled: true,
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        content: {
          description:
            "Full text content to write (create) or chunk to append (append).",
          type: "string",
        },
        file_id: {
          description:
            "Required for mode=append: the fileId returned by the earlier create call.",
          type: "string",
        },
        filename: {
          description:
            "File name with extension, e.g. report.md. Path separators are not allowed.",
          type: "string",
        },
        mode: {
          description:
            'Either "create" (default) for a new file or "append" to continue an existing one.',
          type: "string",
        },
      },
      required: ["filename", "content"],
      type: "object",
    },
  },
  {
    definition: {
      id: "ask_followup_question",
      name: "ask_followup_question",
      shortDescription: "Ask the user a clarifying question.",
      description:
        'Ask the user a question to gather additional information needed to complete the task. Use it when you need clarification or more details to proceed effectively rather than guessing. Generation pauses until the user answers, and the answer is appended to the conversation history, so do not restate it afterwards.\n\n`question` is a clear, specific question. `follow_up` is a list of 1-4 suggested complete, actionable answers (no placeholders); each item is an object `{ "text": "..." }`. The user may pick one or type their own, so the suggestions should cover the most likely useful answers.\n\nExample:\n{ "question": "What is the path to the config file?", "follow_up": [{ "text": "./src/config.json" }, { "text": "./config.json" }] }',
      hidden: true,
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        follow_up: {
          description:
            "Required list of 1-4 suggested responses; each suggestion must be a complete, actionable answer",
          type: "object",
        },
        question: {
          description:
            "Clear, specific question that captures the missing information you need",
          type: "string",
        },
      },
      required: ["question", "follow_up"],
      type: "object",
    },
  },
  {
    definition: {
      id: "update_todo_list",
      name: "update_todo_list",
      shortDescription: "Track task progress with a checklist.",
      description:
        'Replace the entire TODO list with an updated checklist reflecting the current state. Always send the full list; the system overwrites the previous one. The checklist persists across turns and is shown to the user as progress, so keep it up to date as you work.\n\nFormat: a single-level markdown checklist (no nesting or subtasks), listed in intended execution order. Status markers: `[ ]` pending, `[x]` completed, `[-]` in progress.\n\nPrinciples: before updating, confirm which todos are actually done; update multiple statuses in one call; add new actionable items as discovered; only mark a todo completed when fully accomplished; keep unfinished tasks unless instructed to remove them; send an empty string to clear the list when the task is fully done.\n\nExample:\n{ "todos": "[x] Analyze requirements\\n[-] Implement logic\\n[ ] Write tests" }',
      hidden: true,
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        todos: {
          description:
            "Full markdown checklist in execution order, using [ ] for pending, [x] for completed, and [-] for in progress. Send an empty string to clear the list.",
          type: "string",
        },
      },
      required: ["todos"],
      type: "object",
    },
  },
]
