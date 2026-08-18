import { describe, expect, it } from "vitest"

import { UndoRedoStack } from "./history"

const entry = (value: string, caret = 0) => ({ value, caret })

describe("UndoRedoStack", () => {
  it("starts empty with no undo/redo available", () => {
    const stack = new UndoRedoStack(entry("a"))

    expect(stack.current).toEqual(entry("a"))
    expect(stack.canUndo).toBe(false)
    expect(stack.canRedo).toBe(false)
  })

  it("undoes and redoes while tracking the caret", () => {
    const stack = new UndoRedoStack(entry("a", 1), { groupingInterval: 0 })

    stack.set(entry("ab", 2))
    stack.set(entry("abc", 3))

    expect(stack.undo()).toEqual(entry("ab", 2))
    expect(stack.canUndo).toBe(true)
    expect(stack.canRedo).toBe(true)

    expect(stack.undo()).toEqual(entry("a", 1))
    expect(stack.canUndo).toBe(false)

    expect(stack.redo()).toEqual(entry("ab", 2))
    expect(stack.redo()).toEqual(entry("abc", 3))
    expect(stack.canRedo).toBe(false)
  })

  it("returns undefined when there is nothing to undo/redo", () => {
    const stack = new UndoRedoStack(entry("a"))

    expect(stack.undo()).toBeUndefined()
    expect(stack.redo()).toBeUndefined()
  })

  it("truncates the redo branch when a new set happens after undo", () => {
    const stack = new UndoRedoStack(entry("a"))
    stack.set(entry("ab"))
    stack.set(entry("abc"))

    stack.undo()

    stack.set(entry("aX"))

    expect(stack.redo()).toBeUndefined()
    expect(stack.current).toEqual(entry("aX"))
  })

  it("resets the stack", () => {
    const stack = new UndoRedoStack(entry("a"))
    stack.set(entry("ab"))
    stack.set(entry("abc"))

    stack.reset(entry("z", 1))

    expect(stack.current).toEqual(entry("z", 1))
    expect(stack.canUndo).toBe(false)
    expect(stack.canRedo).toBe(false)
  })
})
