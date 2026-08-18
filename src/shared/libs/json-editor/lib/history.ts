/**
 * A single undo/redo history entry: the editor text plus the caret position
 * that should be restored when this entry becomes current.
 */
export interface HistoryEntry<T> {
  value: T
  caret: number
}

export interface UndoRedoStackOptions {
  /** Maximum number of history entries */
  maxHistory?: number
  /** Time window (ms) for grouping consecutive edits */
  groupingInterval?: number
}

/**
 * A synchronous undo/redo stack. Unlike a state-based implementation, `undo`
 * and `redo` return the target entry immediately, so callers can apply the
 * restored text and caret without waiting for a re-render.
 */
export class UndoRedoStack<T> {
  private entries: HistoryEntry<T>[]
  private position: number
  private lastUpdateTime = 0
  private readonly maxHistory: number
  private readonly groupingInterval: number

  constructor(initial: HistoryEntry<T>, options: UndoRedoStackOptions = {}) {
    this.entries = [initial]
    this.position = 0
    this.maxHistory = options.maxHistory ?? 100
    this.groupingInterval = options.groupingInterval ?? 300
  }

  get current(): HistoryEntry<T> {
    return this.entries[this.position]
  }

  get canUndo(): boolean {
    return this.position > 0
  }

  get canRedo(): boolean {
    return this.position < this.entries.length - 1
  }

  get length(): number {
    return this.entries.length
  }

  /** Record a new edit, grouping consecutive fast edits into one entry. */
  set(entry: HistoryEntry<T>): void {
    const now = Date.now()
    const shouldGroup = now - this.lastUpdateTime < this.groupingInterval
    this.lastUpdateTime = now

    let newEntries: HistoryEntry<T>[]
    let newPos: number

    if (shouldGroup && this.position > 0) {
      newEntries = [...this.entries.slice(0, this.position), entry]
      newPos = this.position
    } else {
      newEntries = [...this.entries.slice(0, this.position + 1), entry]
      newPos = this.position + 1
    }

    if (newEntries.length > this.maxHistory) {
      const trimCount = newEntries.length - this.maxHistory
      newEntries = newEntries.slice(trimCount)
      newPos = newPos - trimCount
    }

    this.entries = newEntries
    this.position = Math.max(0, newPos)
  }

  /** Step back one entry, returning it (or undefined when nothing to undo). */
  undo(): HistoryEntry<T> | undefined {
    if (this.position <= 0) return undefined
    this.position -= 1
    return this.entries[this.position]
  }

  /** Step forward one entry, returning it (or undefined when nothing to redo). */
  redo(): HistoryEntry<T> | undefined {
    if (this.position >= this.entries.length - 1) return undefined
    this.position += 1
    return this.entries[this.position]
  }

  /** Clear history and start fresh from the given entry. */
  reset(entry: HistoryEntry<T>): void {
    this.lastUpdateTime = 0
    this.entries = [entry]
    this.position = 0
  }
}
