import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AttachmentsBar } from "./AttachmentsBar"

const mockedState = {
  attachments: [] as unknown[],
}

vi.mock("../../store", () => ({
  useFooterStore: (selector: (state: typeof mockedState) => unknown) =>
    selector(mockedState),
}))

describe("AttachmentsBar", () => {
  beforeEach(() => {
    mockedState.attachments = []
  })

  it("renders an Unknown badge for unsupported attachment types", () => {
    mockedState.attachments = [
      {
        key: "unknown-1",
        attachment: { type: "mystery" } as never,
      },
    ]

    const markup = renderToStaticMarkup(createElement(AttachmentsBar))

    expect(markup).toContain("Unknown")
  })
})
