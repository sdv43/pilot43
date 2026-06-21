import type { RunJsExecutionResult, SandboxParentRequestMessage } from "./types"

import {
  sandboxFrameId,
  sandboxPagePath,
  sandboxRequestType,
  sandboxResponseTimeoutPaddingMs,
} from "./const"
import { isSandboxParentResponseMessage } from "./sandbox-protocol"

let sandboxFramePromise: null | Promise<HTMLIFrameElement> = null

function getExistingSandboxFrame(): HTMLIFrameElement | null {
  const element = document.getElementById(sandboxFrameId)
  return element instanceof HTMLIFrameElement ? element : null
}

async function getSandboxFrame(): Promise<HTMLIFrameElement> {
  const existingFrame = getExistingSandboxFrame()
  if (existingFrame) {
    return existingFrame
  }

  if (sandboxFramePromise !== null) {
    return await sandboxFramePromise
  }

  sandboxFramePromise = new Promise((resolve, reject) => {
    const frame = document.createElement("iframe")
    frame.hidden = true
    frame.id = sandboxFrameId
    frame.src = chrome.runtime.getURL(sandboxPagePath)
    frame.style.display = "none"

    const handleLoad = () => {
      resolve(frame)
    }
    const handleError = () => {
      sandboxFramePromise = null
      reject(new Error("Sandbox page failed to load"))
    }

    frame.addEventListener("error", handleError, { once: true })
    frame.addEventListener("load", handleLoad, { once: true })
    document.body.append(frame)
  })

  try {
    return await sandboxFramePromise
  } catch (error) {
    sandboxFramePromise = null
    throw error
  }
}

export async function runJavaScriptInSandbox(
  code: string,
  timeoutMs: number,
): Promise<RunJsExecutionResult> {
  const sandboxFrame = await getSandboxFrame()
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
