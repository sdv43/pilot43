import { beforeEach, describe, expect, it } from "vitest"

import { prepareValue } from "./components/MessageEditor/components/Editor/utils"
import { footerActions, useFooterStore } from "./store"

const emptyState = {
  editorValue: {
    commands: [],
    text: "",
  },
  attachments: [],
  selectedModelId: null,
  toolsState: {},
}

describe("footer store attachments", () => {
  beforeEach(() => {
    useFooterStore.setState(emptyState)
  })

  it("creates a loading page attachment from a raw numeric #page command", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "#page:42" }, []),
    )

    expect(useFooterStore.getState().attachments).toMatchObject([
      {
        key: "page:42",
        isLoading: true,
        attachment: { type: "page-content" },
      },
    ])
  })

  it("creates a loading selection attachment from a raw #selection command", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "#selection:important_text" }, []),
    )

    expect(useFooterStore.getState().attachments).toMatchObject([
      {
        key: "selection:important_text",
        isLoading: true,
        attachment: { type: "page-content-selection" },
      },
    ])
  })

  it("removes attachments when their commands disappear from the editor", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "#page:42" }, []),
    )
    footerActions.setEditorValue(
      prepareValue(
        {
          commands: useFooterStore.getState().editorValue.commands,
          text: "plain text",
        },
        [],
      ),
    )

    expect(useFooterStore.getState().attachments).toEqual([])
  })

  it("does not duplicate attachments when the same command appears more than once", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "#page:42 and again #page:42" }, []),
    )

    expect(useFooterStore.getState().attachments).toHaveLength(1)
    expect(useFooterStore.getState().attachments[0]?.key).toBe("page:42")
  })

  it("marks the parsed command as errored when the attachment enters an error state", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "#page:42" }, []),
    )

    footerActions.updateAttachment("page:42", () => ({
      isError: true,
      errorMessage: "Cannot load page",
    }))

    expect(useFooterStore.getState().editorValue.commands).toMatchObject([
      {
        command: "page:42",
        isError: true,
      },
    ])
  })
})
