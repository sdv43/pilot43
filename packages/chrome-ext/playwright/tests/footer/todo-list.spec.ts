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
    await expect(page.getByTestId("todo-list-counter")).toHaveText("1/3")

    state.chats = [
      createChat({
        todoList: ["- [x] done", "- [x] finished"].join("\n"),
      }),
    ]

    await page.reload()

    await expect(getTodoListTrigger(page)).toContainText("All tasks completed")
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

  test("limits the visible todo items to five rows before scrolling", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.chats = [
      createChat({
        todoList: Array.from(
          { length: 6 },
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

    expect(maxHeight).toBe("120px")
  })
})
