import type {
  RunJsExecutionResult,
  SandboxedConsoleEntry,
  SandboxedValue,
  SandboxWorkerResponseMessage,
} from "../types"

import {
  maxArrayEntries,
  maxConsoleEntries,
  maxObjectEntries,
  maxStringLength,
  sandboxWorkerResponseType,
} from "../const"
import { isSandboxWorkerRequestMessage } from "./sandbox-protocol"

function truncateString(value: string): string {
  return value.length > maxStringLength
    ? `${value.slice(0, maxStringLength)}... [truncated]`
    : value
}

function sanitizeValue(
  value: unknown,
  seen = new WeakSet<object>(),
): SandboxedValue {
  if (value === null) {
    return null
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, maxArrayEntries)
      .map((item) => sanitizeValue(item, seen))
  }

  switch (typeof value) {
    case "bigint":
      return value.toString()
    case "boolean":
      return value
    case "function":
      return `[Function ${value.name || "anonymous"}]`
    case "number":
      return Number.isFinite(value) ? value : value.toString()
    case "string":
      return truncateString(value)
    case "symbol":
      return value.toString()
    case "undefined":
      return "[undefined]"
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    return {
      message: truncateString(value.message),
      name: value.name,
      stack: value.stack ? truncateString(value.stack) : "[no stack]",
    }
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]"
    }

    seen.add(value)

    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      maxObjectEntries,
    )
    const sanitizedObject: Record<string, SandboxedValue> = {}

    entries.forEach(([key, entryValue]) => {
      sanitizedObject[key] = sanitizeValue(entryValue, seen)
    })

    return sanitizedObject
  }

  return "[unsupported value]"
}

function createConsoleCapture(logs: SandboxedConsoleEntry[]) {
  const capture = (level: SandboxedConsoleEntry["level"]) => {
    return (...values: unknown[]) => {
      if (logs.length >= maxConsoleEntries) {
        return
      }

      logs.push({
        level,
        values: values.map((value) => sanitizeValue(value)),
      })
    }
  }

  return {
    assert: (condition: unknown, ...values: unknown[]) => {
      if (!condition) {
        capture("error")(...values)
      }
    },
    debug: capture("debug"),
    dir: capture("log"),
    error: capture("error"),
    info: capture("info"),
    log: capture("log"),
    table: capture("log"),
    trace: capture("debug"),
    warn: capture("warn"),
  }
}

function createBlockedFunction(apiName: string): () => never {
  return () => {
    throw new Error(`${apiName} is disabled in run_js.`)
  }
}

function overrideGlobal(name: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value,
      writable: false,
    })
  } catch {
    // Ignore globals that cannot be redefined in this runtime.
  }
}

function installGlobalGuards(
  consoleCapture: ReturnType<typeof createConsoleCapture>,
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalPostMessage: typeof self.postMessage =
    self.postMessage.bind(self)
  const blockedNavigator = Object.freeze({
    sendBeacon: createBlockedFunction("navigator.sendBeacon"),
    userAgent: "pilot43-run_js-sandbox",
  })

  overrideGlobal("browser", undefined)
  overrideGlobal("caches", undefined)
  overrideGlobal("chrome", undefined)
  overrideGlobal("close", createBlockedFunction("close"))
  overrideGlobal("console", consoleCapture)
  overrideGlobal("EventSource", createBlockedFunction("EventSource"))
  overrideGlobal("fetch", createBlockedFunction("fetch"))
  overrideGlobal("importScripts", createBlockedFunction("importScripts"))
  overrideGlobal("indexedDB", undefined)
  overrideGlobal("navigator", blockedNavigator)
  overrideGlobal("postMessage", createBlockedFunction("postMessage"))
  overrideGlobal("SharedWorker", createBlockedFunction("SharedWorker"))
  overrideGlobal("WebSocket", createBlockedFunction("WebSocket"))
  overrideGlobal("Worker", createBlockedFunction("Worker"))
  overrideGlobal("XMLHttpRequest", createBlockedFunction("XMLHttpRequest"))

  return { originalPostMessage }
}

async function executeUserCode(
  code: string,
  consoleCapture: ReturnType<typeof createConsoleCapture>,
) {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const runUserCode = Function(
    "console",
    `"use strict"; return (async () => {\n${code}\n})();`,
  ) as (
    consoleProxy: ReturnType<typeof createConsoleCapture>,
  ) => Promise<unknown>

  return await runUserCode(consoleCapture)
}

function postResult(
  originalPostMessage: typeof self.postMessage,
  message: SandboxWorkerResponseMessage,
) {
  originalPostMessage(message)
}

function createResultMessage(
  id: string,
  payload: RunJsExecutionResult,
): SandboxWorkerResponseMessage {
  return {
    id,
    payload,
    type: sandboxWorkerResponseType,
  }
}

self.addEventListener("message", (event) => {
  void (async () => {
    if (!isSandboxWorkerRequestMessage(event.data)) {
      return
    }

    const logs: SandboxedConsoleEntry[] = []
    const consoleCapture = createConsoleCapture(logs)
    const startedAt = Date.now()
    let originalPostMessage: typeof self.postMessage | undefined

    try {
      const guards = installGlobalGuards(consoleCapture)
      originalPostMessage = guards.originalPostMessage

      const value = await executeUserCode(
        event.data.payload.code,
        consoleCapture,
      )

      postResult(
        originalPostMessage,
        createResultMessage(event.data.id, {
          durationMs: Date.now() - startedAt,
          logs,
          ok: true,
          value: sanitizeValue(value),
        }),
      )
    } catch (error) {
      const errorObject =
        error instanceof Error ? error : new Error(String(error))
      const durationMs = Date.now() - startedAt

      const result = createResultMessage(event.data.id, {
        durationMs,
        error: {
          message: truncateString(errorObject.message),
          name: errorObject.name,
          ...(errorObject.stack
            ? { stack: truncateString(errorObject.stack) }
            : {}),
        },
        logs,
        ok: false,
      })

      if (originalPostMessage) {
        postResult(originalPostMessage, result)
      } else {
        self.postMessage(result)
      }
    }
  })()
})
