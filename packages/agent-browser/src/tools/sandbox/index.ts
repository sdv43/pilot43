import type {
  RunJsExecutionResult,
  SandboxParentRequestMessage,
} from "../types"

import {
  sandboxFrameId,
  sandboxRequestType,
  sandboxResponseTimeoutPaddingMs,
} from "../const"
import { isSandboxParentResponseMessage } from "./sandbox-protocol"

/**
 * Runs JavaScript in the sandboxed extension page at `pageUrl`, which hosts a
 * Web Worker (see `sandbox-page.ts`). The page is loaded into a hidden iframe
 * on first use and reused afterwards.
 */
export function createIframeSandbox(pageUrl: string) {
  let sandboxFramePromise: null | Promise<HTMLIFrameElement> = null

  async function getSandboxFrame(): Promise<HTMLIFrameElement> {
    // A pending load must be awaited first: the frame is already in the DOM
    // before it has finished loading.
    if (sandboxFramePromise !== null) {
      return await sandboxFramePromise
    }

    const existingFrame = getExistingSandboxFrame()
    if (existingFrame) {
      return existingFrame
    }

    sandboxFramePromise = loadSandboxFrame(pageUrl)

    try {
      return await sandboxFramePromise
    } catch (error) {
      sandboxFramePromise = null
      throw error
    }
  }

  return {
    run: async (code: string, timeoutMs: number) =>
      await runJavaScriptInFrame(await getSandboxFrame(), code, timeoutMs),
  }
}

function getExistingSandboxFrame(): HTMLIFrameElement | null {
  const element = document.getElementById(sandboxFrameId)
  return element instanceof HTMLIFrameElement ? element : null
}

function loadSandboxFrame(pageUrl: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe")
    frame.hidden = true
    frame.id = sandboxFrameId
    frame.src = pageUrl
    frame.style.display = "none"

    const handleLoad = () => {
      resolve(frame)
    }
    const handleError = () => {
      reject(new Error("Sandbox page failed to load"))
    }

    frame.addEventListener("error", handleError, { once: true })
    frame.addEventListener("load", handleLoad, { once: true })
    document.body.append(frame)
  })
}

async function runJavaScriptInFrame(
  sandboxFrame: HTMLIFrameElement,
  code: string,
  timeoutMs: number,
): Promise<RunJsExecutionResult> {
  const sandboxWindow = sandboxFrame.contentWindow
  if (!sandboxWindow) {
    throw new Error("Sandbox frame is unavailable")
  }

  return await new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID()

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener("message", handleMessage)
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== sandboxWindow) {
        return
      }

      if (!isSandboxParentResponseMessage(event.data)) {
        return
      }

      if (event.data.id !== requestId) {
        return
      }

      cleanup()
      resolve(event.data.payload)
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error("Sandbox runtime did not respond in time"))
    }, timeoutMs + sandboxResponseTimeoutPaddingMs)

    window.addEventListener("message", handleMessage)

    const message: SandboxParentRequestMessage = {
      id: requestId,
      payload: { code, timeoutMs },
      source: "pilot43-offscreen",
      type: sandboxRequestType,
    }

    sandboxWindow.postMessage(message, "*")
  })
}
