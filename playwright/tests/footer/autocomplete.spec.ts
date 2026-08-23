import { expect, test } from "../../fixtures"
import {
  getEditorAutocompleteOption,
  getMessageEditor,
  getModelSelector,
} from "../utils/footer"
import { openBottomBar, setupFooterMocks } from "./helpers"

test.describe("editor autocomplete", () => {
  test("supports keyboard navigation, closes on escape, and resets selection on reopen", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.commands = [
      {
        id: "cmd-1",
        name: "alpha",
        prompt: "Alpha prompt",
        builtin: false,
      },
      {
        id: "cmd-2",
        name: "beta",
        prompt: "Beta prompt",
        builtin: false,
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("/")

    await expect(getEditorAutocompleteOption(page, "/alpha")).toBeVisible()
    await getMessageEditor(page).press("ArrowDown")
    await getMessageEditor(page).press("ArrowUp")
    await getMessageEditor(page).press("Escape")

    await expect(getEditorAutocompleteOption(page, "/alpha")).not.toBeVisible()

    await getModelSelector(page).focus()
    await getMessageEditor(page).focus()
    await getMessageEditor(page).press("Enter")

    await expect(getMessageEditor(page)).toHaveValue("/alpha ")

    const selectionRange = await getMessageEditor(page).evaluate((textarea) => {
      const editor = textarea as HTMLTextAreaElement

      return {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      }
    })

    expect(selectionRange).toEqual({ start: 7, end: 7 })
  })

  test("selects hash autocomplete options with Tab", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.pages = [
      {
        id: 42,
        title: "Alpha Page",
        url: "https://example.com/alpha",
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("See #")
    await expect(
      getEditorAutocompleteOption(page, "#page:Alpha_Page"),
    ).toBeVisible()
    await getMessageEditor(page).press("Tab")

    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")
  })

  test("undoes a slash command inserted from autocomplete", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.commands = [
      {
        id: "cmd-1",
        name: "alpha",
        prompt: "Alpha prompt",
        builtin: false,
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("/")
    await expect(getEditorAutocompleteOption(page, "/alpha")).toBeVisible()
    await getMessageEditor(page).press("Tab")

    await expect(getMessageEditor(page)).toHaveValue("/alpha ")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("/")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("")

    await getMessageEditor(page).press("Control+y")
    await expect(getMessageEditor(page)).toHaveValue("/")
  })

  test("undoes a hash command inserted from autocomplete", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.pages = [
      {
        id: 42,
        title: "Alpha Page",
        url: "https://example.com/alpha",
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("See #")
    await expect(
      getEditorAutocompleteOption(page, "#page:Alpha_Page"),
    ).toBeVisible()
    await getMessageEditor(page).press("Tab")

    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("See #")
  })

  test("undoes a hash command inserted by clicking the autocomplete option", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.pages = [
      {
        id: 42,
        title: "Alpha Page",
        url: "https://example.com/alpha",
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("See #")
    const option = getEditorAutocompleteOption(page, "#page:Alpha_Page")
    await expect(option).toBeVisible()
    await option.click()

    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("See #")
  })

  test("undoes an autocomplete expansion of a partial query", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.pages = [
      {
        id: 42,
        title: "Alpha Page",
        url: "https://example.com/alpha",
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("See #pag")
    await expect(
      getEditorAutocompleteOption(page, "#page:Alpha_Page"),
    ).toBeVisible()
    await getMessageEditor(page).press("Tab")

    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("See #pag")
  })

  test("keeps caret inside the text after undoing an autocomplete insertion", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.pages = [
      {
        id: 42,
        title: "Alpha Page",
        url: "https://example.com/alpha",
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("See #")
    await expect(
      getEditorAutocompleteOption(page, "#page:Alpha_Page"),
    ).toBeVisible()
    await getMessageEditor(page).press("Tab")

    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

    const caretAfterInsert = await getMessageEditor(page).evaluate(
      (textarea) => (textarea as HTMLTextAreaElement).selectionStart,
    )
    await getMessageEditor(page).press("Control+z")

    const caretAfterUndo = await getMessageEditor(page).evaluate(
      (textarea) => (textarea as HTMLTextAreaElement).selectionStart,
    )

    expect(caretAfterInsert).toBe("See #page:Alpha_Page ".length)
    expect(caretAfterUndo).toBe("See #".length)

    // Redo should restore the insertion and place the caret at its end.
    await getMessageEditor(page).press("Control+Shift+z")

    expect(await getMessageEditor(page).inputValue()).toBe(
      "See #page:Alpha_Page ",
    )
    const caretAfterRedo = await getMessageEditor(page).evaluate(
      (textarea) => (textarea as HTMLTextAreaElement).selectionStart,
    )
    expect(caretAfterRedo).toBe("See #page:Alpha_Page ".length)
  })

  test("undoes autocomplete insert via Cmd+Z on macOS-style typing", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.pages = [
      {
        id: 42,
        title: "Alpha Page",
        url: "https://example.com/alpha",
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).pressSequentially("See #", { delay: 10 })
    await expect(
      getEditorAutocompleteOption(page, "#page:Alpha_Page"),
    ).toBeVisible()
    await getMessageEditor(page).press("Tab")

    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

    await getMessageEditor(page).press("Meta+z")
    await expect(getMessageEditor(page)).toHaveValue("See #")
  })

  test("undoes autocomplete insert then continues typing and undoes to the start", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.pages = [
      {
        id: 42,
        title: "Alpha Page",
        url: "https://example.com/alpha",
      },
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("See #")
    await expect(
      getEditorAutocompleteOption(page, "#page:Alpha_Page"),
    ).toBeVisible()
    await getMessageEditor(page).press("Tab")

    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")
    await getMessageEditor(page).type("and more")

    // "and more" is 8 characters typed one-by-one → two batches (5 + 3).
    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue(
      "See #page:Alpha_Page and m",
    )

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("See #")
  })

  test("handles undo, redo, and undo again on a single character", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).press("a")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("")

    await getMessageEditor(page).press("Control+Shift+z")
    await expect(getMessageEditor(page)).toHaveValue("a")

    // Regression: after redo, a subsequent undo must restore "" (not stay
    // stuck on "a").
    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("")

    await getMessageEditor(page).press("Control+Shift+z")
    await expect(getMessageEditor(page)).toHaveValue("a")
  })

  test("undoes consecutive typing in batches of five characters", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).pressSequentially("abcde", { delay: 10 })
    await expect(getMessageEditor(page)).toHaveValue("abcde")

    await getMessageEditor(page).press("Control+z")
    await expect(getMessageEditor(page)).toHaveValue("")

    await getMessageEditor(page).press("Control+Shift+z")
    await expect(getMessageEditor(page)).toHaveValue("abcde")
  })
})
