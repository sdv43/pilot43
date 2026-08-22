import { beforeEach, describe, expect, it } from "vitest"

import { prepareValue } from "./components/MessageEditor/components/Editor/utils"
import { footerActions, useFooterStore } from "./store"

const emptyState = {
  editorValue: {
    commands: [],
    text: "",
  },
  attachments: [],
  historyFuture: [],
  historyPast: [],
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

describe("footer store undo/redo", () => {
  beforeEach(() => {
    useFooterStore.setState(emptyState)
  })

  const setText = (text: string) =>
    footerActions.setEditorValue(prepareValue({ commands: [], text }, []))

  it("coalesces consecutive single-character inserts into undo batches of five", () => {
    setText("a")
    setText("ab")
    setText("abc")
    setText("abcd")
    setText("abcde")
    setText("abcdef")

    const entries = useFooterStore.getState().historyPast
    // Characters 1-5 form one batch; character 6 opens a new batch.
    expect(entries.map((entry) => entry.value.text)).toEqual(["", "abcde"])
    expect(entries.map((entry) => entry.count)).toEqual([5, 1])

    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("abcde")

    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("abcde")

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("abcdef")
  })

  it("coalesces consecutive single-character deletes into undo batches of five", () => {
    setText("abcdefghijk") // 11 chars
    footerActions.undo() // back to ""

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("abcdefghijk")

    // Now delete one char at a time: 11 → 0 is 11 deletes = 3 batches (5+5+1).
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abcdefghij" }, []),
    )
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abcdefghi" }, []),
    )
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abcdefgh" }, []),
    )
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abcdefg" }, []),
    )
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abcdef" }, []),
    )
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abcde" }, []),
    )
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abcd" }, []),
    )
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "abc" }, []),
    )
    footerActions.setEditorValue(prepareValue({ commands: [], text: "ab" }, []))
    footerActions.setEditorValue(prepareValue({ commands: [], text: "a" }, []))
    footerActions.setEditorValue(prepareValue({ commands: [], text: "" }, []))

    const deleteEntries = useFooterStore
      .getState()
      .historyPast.filter((entry) => entry.kind === "delete")
      .map((entry) => entry.count)
    // Exactly 11 delete edits spread over 5/5/1 batches.
    expect(deleteEntries).toEqual([5, 5, 1])
  })

  it("keeps an atomic autocomplete expansion as a separate undo step", () => {
    setText("/")
    setText("/alpha ")

    // "/" is a single-character insert; "/alpha " is a multi-char replacement
    // so it must be its own step, not merged into the typing burst.
    expect(
      useFooterStore.getState().historyPast.map((entry) => entry.value.text),
    ).toEqual(["", "/"])

    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("/")

    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("/")

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("/alpha ")
  })

  it("clears redo history when a new edit happens after undo", () => {
    setText("a")
    setText("ab")

    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")

    setText("z")
    expect(useFooterStore.getState().historyFuture).toEqual([])

    footerActions.redo()
    // Redo is a no-op because the future was cleared by the new edit.
    expect(useFooterStore.getState().editorValue.text).toBe("z")
  })

  it("keeps working after undo → redo → undo on a single character", () => {
    setText("a")

    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("a")

    // Regression: redo must restore the undo-able boundary state, so a second
    // undo after redo should undo the redone "a" back to "".
    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("a")
  })

  it("returns the edit-site caret position from undo and redo", () => {
    setText("a")
    setText("ab")
    setText("abc")

    // "abc" was typed as 3 consecutive single-char edits, so it forms one
    // undo batch; undoing it restores "" (the batch base).
    const undoCaret = footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")
    expect(undoCaret).toBe(0)

    // Redo restores the entire batch and lands the caret at its end.
    const redoCaret = footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("abc")
    expect(redoCaret).toBe(3)
  })

  it("lands the caret at the edit site for a middle-of-text change", () => {
    setText("hello xxx")
    // Replace the trailing "xxx" with "world" in one atomic edit.
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "hello world" }, []),
    )

    const undoCaret = footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("hello xxx")
    expect(undoCaret).toBe(6)

    const redoCaret = footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("hello world")
    expect(redoCaret).toBe(11)
  })

  it("does not record a history entry when only parsed commands change", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "#page:42" }, []),
    )
    footerActions.setEditorValue(
      prepareValue(
        {
          commands: useFooterStore.getState().editorValue.commands,
          text: "#page:42",
        },
        [],
      ),
    )

    const historyPast = useFooterStore.getState().historyPast
    expect(historyPast.some((entry) => entry.value.text === "#page:42")).toBe(
      false,
    )
  })

  it("restores attachments when undoing/redoing a command that creates them", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "#page:42" }, []),
    )

    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")
    expect(useFooterStore.getState().attachments).toEqual([])

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("#page:42")
    expect(useFooterStore.getState().attachments).toMatchObject([
      {
        key: "page:42",
        isLoading: true,
        attachment: { type: "page-content" },
      },
    ])
  })

  it("is a no-op when there is nothing to undo or redo", () => {
    footerActions.undo()
    expect(useFooterStore.getState().editorValue.text).toBe("")

    footerActions.redo()
    expect(useFooterStore.getState().editorValue.text).toBe("")
  })

  it("clears history when reset", () => {
    footerActions.setEditorValue(
      prepareValue({ commands: [], text: "hello" }, []),
    )
    footerActions.redo()
    footerActions.undo()

    footerActions.reset()

    expect(useFooterStore.getState().historyPast).toEqual([])
    expect(useFooterStore.getState().historyFuture).toEqual([])
  })
})
