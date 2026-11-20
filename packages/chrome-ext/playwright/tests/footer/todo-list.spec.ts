import { expect, test } from "../../fixtures"
import {
  getTodoList,
  getTodoListClearButton,
  getTodoListItems,
  getTodoListTrigger,
  openTodoList,
} from "../utils/footer"
import { createChat, openBottomBar, setupFooterMocks } from "./helpers"

test.describe("todo list", () => {
  test("shows only when the selected chat has parsed todo items", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [createChat({ todoList: "plain text only" })]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getTodoList(page)).toHaveCount(0)
  })

  test("shows the in-progress label, progress counter, and completed state", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [
      createChat({
        todoList: ["- [x] done", "- [-] active", "- [ ] pending"].join("\n"),
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)

    await expect(getTodoList(page)).toBeVisible()
    await expect(getTodoListTrigger(page)).toContainText("active")
    await expect(page.getByTestId("todo-list-counter")).toHaveText("1 / 3")

    state.chats = [
      createChat({
        todoList: ["- [x] done", "- [x] finished"].join("\n"),
      }),
    ]

    await page.reload()

    await expect(getTodoListTrigger(page)).toContainText("All tasks done")
    await expect(getTodoListTrigger(page)).toHaveAttribute(
      "data-complete",
      "true",
    )
  })

  test("clears the todo list and closes the popover", async ({
    sidepanelPage,
  }) => {
    const { state, recorders } = setupFooterMocks(sidepanelPage)
    state.chats = [
      createChat({ todoList: ["- [ ] first", "- [ ] second"].join("\n") }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openTodoList(page)
    await expect(getTodoListItems(page)).toHaveCount(2)

    await getTodoListClearButton(page).click()

    await expect.poll(() => recorders.chatTodoListClearCalls).toEqual(["c1"])
    await expect(getTodoList(page)).toHaveCount(0)
  })

  test("collapses the open plan with the chevron, Escape or a click outside", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [
      createChat({ todoList: ["- [x] first", "- [-] second"].join("\n") }),
    ]

    const page = sidepanelPage.page
    const trigger = getTodoListTrigger(page)
    const firstItem = getTodoListItems(page).first()

    await openBottomBar(sidepanelPage)
    await openTodoList(page)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(firstItem).toBeVisible()

    await page.getByRole("button", { name: "Collapse plan" }).click()
    await expect(firstItem).toBeHidden()
    await expect(trigger).toBeFocused()

    await openTodoList(page)
    await page.keyboard.press("Escape")
    await expect(firstItem).toBeHidden()

    // A press on the conversation, away from the plan.
    await openTodoList(page)
    await page.mouse.click(200, 120)
    await expect(firstItem).toBeHidden()
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  test("limits the visible todo items to six rows before scrolling", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [
      createChat({
        todoList: Array.from(
          { length: 8 },
          (_, index) => `- [ ] task ${index + 1}`,
        ).join("\n"),
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openTodoList(page)

    const maxHeight = await getTodoListItems(page)
      .first()
      .evaluate((item) => (item.parentElement as HTMLElement).style.maxHeight)

    expect(maxHeight).toBe("180px")
  })
})
