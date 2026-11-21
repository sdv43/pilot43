import { type ComponentPropsWithoutRef } from "react"

export interface SummaryDividerProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  /**
   * `true` while the summary is being written; otherwise the divider marks
   * where the history the model gets as a summary ends.
   */
  isWorking?: boolean
}
