import { describe, expect, it } from "vitest"

import { getAttachmentPreview } from "./utils"

describe("getAttachmentPreview", () => {
  it("returns a text preview for known media types with parameters", () => {
    const preview = getAttachmentPreview(
      {
        content: '{"ok":true}',
        mediaType: "application/json; charset=utf-8",
        type: "file",
      },
      "Attachment",
    )

    expect(preview).toMatchObject({
      content: '{"ok":true}',
      kind: "text",
      meta: "application/json; charset=utf-8",
      title: "Attachment",
    })
  })
})
