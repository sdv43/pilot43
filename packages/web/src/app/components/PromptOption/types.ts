import type { ComponentPropsWithRef } from "react"

export interface PromptOptionProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "title"
> {
  /** Part of the title to highlight (the text typed after `/`). */
  highlight?: string
  isSelected?: boolean
  preview: string
  title: string
}
