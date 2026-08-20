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

  it("returns the full text content for previewable text files", () => {
    const preview = getAttachmentPreview(
      {
        content: "line one\nline two\nline three",
        mediaType: "text/plain",
        name: "notes.txt",
        type: "file",
      },
      "Attachment",
    )

    expect(preview).toMatchObject({
      content: "line one\nline two\nline three",
      kind: "text",
      title: "notes.txt",
    })
  })

  it("returns an image preview for image files", () => {
    const preview = getAttachmentPreview(
      {
        content: "data:image/png;base64,AAAA",
        mediaType: "image/png",
        name: "diagram.png",
        type: "file",
      },
      "Attachment",
    )

    expect(preview).toEqual({
      kind: "image",
      meta: "image/png",
      src: "data:image/png;base64,AAAA",
      title: "diagram.png",
    })
  })

  it("returns no preview for binary files like PDFs", () => {
    expect(
      getAttachmentPreview(
        {
          content: "data:application/pdf;base64,AAAA",
          mediaType: "application/pdf",
          name: "spec.pdf",
          type: "file",
        },
        "Attachment",
      ),
    ).toBeNull()
  })

  it("returns explicit error and loading previews when requested", () => {
    expect(
      getAttachmentPreview(
        {
          type: "page-content",
          title: "Page",
          url: "https://example.com",
        },
        "Page",
        false,
        true,
        "Cannot load page",
      ),
    ).toMatchObject({
      content: "Cannot load page",
      kind: "text",
      title: "Page",
    })

    expect(
      getAttachmentPreview(
        {
          type: "page-content-selection",
          title: "Selection",
          url: "https://example.com",
        },
        "Selection",
        true,
      ),
    ).toMatchObject({
      content: "Attachment is still loading...",
      kind: "text",
      title: "Selection",
    })
  })
})
