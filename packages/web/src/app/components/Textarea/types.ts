import type { ComponentPropsWithRef } from "react"

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  /** Renders the value in the monospace code font. */
  mono?: boolean
}
