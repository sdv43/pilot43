import type { MessageFormat, MessageResponseFormat } from "./types"

export function sendMessage<
  T extends MessageFormat = MessageFormat,
  R extends MessageResponseFormat = MessageResponseFormat,
>(message: T, tabId?: number): Promise<R["result"]> {
  console.log(
    `%c[Message Out] %c${message.target as string}::${message.action as string}`,
    "color: #1a73e8; font-weight: bold",
    "color: inherit",
    message.payload,
  )

  return new Promise((resolve, reject) => {
    if (tabId !== undefined) {
      chrome.tabs.sendMessage(tabId, message, (r) => {
        const response = r as unknown as R

        if (chrome.runtime.lastError) {
          console.error(
            `%c[Message Response Error] %c${message.target as string}::${message.action as string}`,
            "color: #d93025; font-weight: bold",
            "color: inherit",
            chrome.runtime.lastError.message,
          )
          reject(new Error(chrome.runtime.lastError.message))
        } else if (response.error) {
          console.error(
            `%c[Message Response Error] %c${message.target as string}::${message.action as string}`,
            "color: #d93025; font-weight: bold",
            "color: inherit",
            response.error,
          )
          reject(new Error(response.error))
        } else {
          console.log(
            `%c[Message Response] %c${message.target as string}::${message.action as string}`,
            "color: #1a73e8; font-weight: bold",
            "color: inherit",
            response.result,
          )
          resolve(response.result)
        }
      })
    } else {
      chrome.runtime.sendMessage(message, (r) => {
        const response = r as unknown as R

        if (chrome.runtime.lastError) {
          console.error(
            `%c[Message Response Error] %c${message.target as string}::${message.action as string}`,
            "color: #d93025; font-weight: bold",
            "color: inherit",
            chrome.runtime.lastError.message,
          )
          reject(new Error(chrome.runtime.lastError.message))
        } else if (response.error) {
          console.error(
            `%c[Message Response Error] %c${message.target as string}::${message.action as string}`,
            "color: #d93025; font-weight: bold",
            "color: inherit",
            response.error,
          )
          reject(new Error(response.error))
        } else {
          console.log(
            `%c[Message Response] %c${message.target as string}::${message.action as string}`,
            "color: #1a73e8; font-weight: bold",
            "color: inherit",
            response.result,
          )
          resolve(response.result)
        }
      })
    }
  })
}

export function addMessageListener<
  T extends MessageFormat = MessageFormat,
  R extends MessageResponseFormat = MessageResponseFormat,
>(
  target: T["target"],
  action: T["action"],
  handler: (message: T, sender: chrome.runtime.MessageSender) => Promise<R> | R,
): void {
  chrome.runtime.onMessage.addListener(
    (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ) => {
      if (
        (message as { target?: string }).target !== target ||
        (message as { action?: string }).action !== action
      ) {
        return false
      }

      const msg = message as T

      console.log(
        `%c[Message In] %c${msg.target as string}::${msg.action as string}`,
        "color: #188038; font-weight: bold",
        "color: inherit",
        msg.payload,
      )

      Promise.resolve(handler(msg, sender))
        .then((response) => {
          console.log(
            `%c[Message Response] %c${msg.target as string}::${msg.action as string}`,
            "color: #188038; font-weight: bold",
            "color: inherit",
            response,
          )
          sendResponse(response)
        })
        .catch((error) => {
          console.error(
            `%c[Message Response Error] %c${msg.target as string}::${msg.action as string}`,
            "color: #d93025; font-weight: bold",
            "color: inherit",
            error,
          )
          sendResponse({ error: `${error}` })
        })

      return true
    },
  )
}
