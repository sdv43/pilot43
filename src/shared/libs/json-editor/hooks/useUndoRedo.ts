import { useMemo, useRef, useState } from "react"

import type { HistoryEntry } from "../lib/history"

import { UndoRedoStack } from "../lib/history"

interface UseUndoRedoOptions {
  /** Maximum number of history entries */
  maxHistory?: number
  /** Time window (ms) for grouping consecutive actions */
  groupingInterval?: number
}

interface UseUndoRedoResult<T> {
  current: HistoryEntry<T>
  canUndo: boolean
  canRedo: boolean
  historyLength: number
  set: (entry: HistoryEntry<T>) => void
  undo: () => HistoryEntry<T> | undefined
  redo: () => HistoryEntry<T> | undefined
  reset: (entry: HistoryEntry<T>) => void
}

/**
 * A hook wrapping the synchronous UndoRedoStack so its API stays stable across
 * renders. The stack lives in a ref, so `undo()`/`redo()` return the restored
 * entry immediately instead of relying on a re-render.
 */
export function useUndoRedo<T>(
  initialEntry: HistoryEntry<T>,
  options: UseUndoRedoOptions = {},
): UseUndoRedoResult<T> {
  const { maxHistory = 100, groupingInterval = 300 } = options

  const stackRef = useRef<UndoRedoStack<T>>(
    new UndoRedoStack(initialEntry, { maxHistory, groupingInterval }),
  )

  // State mirror used only to re-render consumers (e.g. toolbar buttons).
  const [, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  return useMemo<UseUndoRedoResult<T>>(
    () => ({
      get current() {
        return stackRef.current.current
      },
      get canUndo() {
        return stackRef.current.canUndo
      },
      get canRedo() {
        return stackRef.current.canRedo
      },
      get historyLength() {
        return stackRef.current.length
      },
      set: (entry: HistoryEntry<T>) => {
        stackRef.current.set(entry)
        bump()
      },
      undo: () => {
        const entry = stackRef.current.undo()
        bump()
        return entry
      },
      redo: () => {
        const entry = stackRef.current.redo()
        bump()
        return entry
      },
      reset: (entry: HistoryEntry<T>) => {
        stackRef.current.reset(entry)
        bump()
      },
    }),
    [],
  )
}
