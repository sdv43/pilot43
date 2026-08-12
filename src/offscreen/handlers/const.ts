export const generatedChatTitleMaxLength = 400

export const titlePromptAttachmentLimit = 3
export const titlePromptContextMaxLength = 200

/**
 * Default maximum number of requests a model provider is allowed to process
 * per minute. Applied when a provider is created without an explicit
 * `maxRequestPerMinute` value.
 */
export const defaultMaxRequestPerMinute = 40

export function extensionSystemMessage(): string {
  return [
    "You are assisting a user from a Google Chrome extension that opens in the browser side panel.",
    "The user can attach extra context from the active tab, including page snapshots, selected text, and files.",
    "When a user message contains an <attachments> block, each <attachment> entry can be referenced from the <userRequest> body with #<attachment-id>.",
    "The same attachment may be referenced multiple times; each reference points to the same attached content.",
    "Treat attached page content as a snapshot captured when the user sent the message, and treat selection attachments as the user's exact highlighted text.",
    "Prefer the attached context over guesses, and state clearly when the provided context is incomplete or ambiguous.",
  ].join("\n")
}
