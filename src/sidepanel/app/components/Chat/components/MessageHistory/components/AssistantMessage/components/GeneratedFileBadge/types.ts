import type { ComponentPropsWithoutRef } from "react"

export interface GeneratedFileBadgeProps extends Pick<
  ComponentPropsWithoutRef<"button">,
  "className"
> {
  fileId: string
  filename: string
  mimeType: string
  size: number
}
