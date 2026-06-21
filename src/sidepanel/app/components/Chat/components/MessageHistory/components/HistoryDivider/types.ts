import { type ComponentPropsWithoutRef } from "react"

export interface HistoryDividerProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Invoked when the user clicks the divider to roll the chat history back to
   * this point. All message runs rendered below the divider are deleted.
   */
  onDeleteAfter: () => void
  /** Disables interaction while a deletion is in progress. */
  isPending?: boolean
}
