import type {
  RunJsExecutionFailure,
  RunJsExecutionResult,
  SandboxParentResponseMessage,
  SandboxWorkerRequestMessage,
} from "./types"

import {
  defaultRunJsTimeoutMs,
  maxRunJsTimeoutMs,
  minRunJsTimeoutMs,
  sandboxResponseType,
  sandboxWorkerRequestType,
} from "./const"
import {
  isSandboxParentRequestMessage,
  isSandboxWorkerResponseMessage,
} from "./sandbox-protocol"
import workerUrl from "./sandbox-worker?worker&url"

function clampTimeoutMs(timeoutMs: number): number {
  if (!Number.isFinite(timeoutMs)) {
    return defaultRunJsTimeoutMs
  }

  return Math.min(maxRunJsTimeoutMs, Math.max(minRunJsTimeoutMs, timeoutMs))
}

function createFailureResult(
  durationMs: number,
  message: string,
  name: string,
): RunJsExecutionFailure {
  return {
    durationMs,
    error: { message, name },
    logs: [],
    ok: false,
  }
}

async function executeInWorker(
  code: string,
  timeoutMs: number,
): Promise<RunJsExecutionResult> {
  const response = await fetch(workerUrl)
  const workerCode = await response.text()
  const blob = new Blob([workerCode], { type: "application/javascript" })
  const blobUrl = URL.createObjectURL(blob)

  return await new Promise((resolve) => {
    const startedAt = Date.now()
    const requestId = crypto.randomUUID()
    const worker = new Worker(blobUrl)

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      worker.removeEventListener("error", handleError)
      worker.removeEventListener("message", handleMessage)
      worker.removeEventListener("messageerror", handleMessageError)
      worker.terminate()
      URL.revokeObjectURL(blobUrl)
    }

    const handleError = (event: ErrorEvent) => {
      cleanup()
      resolve(
        createFailureResult(
          Date.now() - startedAt,
          event.message || "Sandbox worker failed",
          "WorkerError",
        ),
      )
    }
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isSandboxWorkerResponseMessage(event.data)) {
        return
      }

      if (event.data.id !== requestId) {
        return
      }

      cleanup()
      resolve(event.data.payload)
    }
    const handleMessageError = () => {
      cleanup()
      resolve(
        createFailureResult(
          Date.now() - startedAt,
          "Sandbox worker returned an unreadable response",
          "MessageError",
        ),
      )
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      resolve(
        createFailureResult(
          Date.now() - startedAt,
          `Execution timed out after ${timeoutMs}ms`,
          "TimeoutError",
        ),
      )
    }, timeoutMs)

    worker.addEventListener("error", handleError)
    worker.addEventListener("message", handleMessage)
    worker.addEventListener("messageerror", handleMessageError)

    const message: SandboxWorkerRequestMessage = {
      id: requestId,
      payload: { code },
      type: sandboxWorkerRequestType,
    }

    worker.postMessage(message)
  })
}

window.addEventListener("message", (event) => {
  void (async () => {
    if (!isSandboxParentRequestMessage(event.data)) {
      return
    }

    const responseTarget = event.source
    if (!responseTarget || typeof responseTarget.postMessage !== "function") {
      return
    }

    const timeoutMs = clampTimeoutMs(event.data.payload.timeoutMs)
    const result = await executeInWorker(event.data.payload.code, timeoutMs)
    const response: SandboxParentResponseMessage = {
      id: event.data.id,
      payload: result,
      source: "pilot43-sandbox",
      type: sandboxResponseType,
    }

    ;(responseTarget as Window).postMessage(response, "*")
  })()
})
