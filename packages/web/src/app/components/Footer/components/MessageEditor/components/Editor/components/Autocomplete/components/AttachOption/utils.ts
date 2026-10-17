import type { EditorCommandOption } from "../../../../types"

/** Title and secondary line of a `#` option. */
export function describeAttachOption(option: EditorCommandOption) {
  const attachment = option.attachment

  if (attachment && "url" in attachment) {
    const title = "title" in attachment ? attachment.title : undefined
    let host = attachment.url

    try {
      host = new URL(attachment.url).host
    } catch {
      // Keep the raw URL.
    }

    return {
      detail:
        "content" in attachment && "uniqueKey" in attachment
          ? `Selection on ${host}`
          : host,
      title: title || attachment.url,
    }
  }

  if (attachment && "name" in attachment) {
    return { detail: attachment.mediaType, title: attachment.name }
  }

  return {
    detail: option.disabled ? "Nothing is selected" : undefined,
    title: option.command,
  }
}
