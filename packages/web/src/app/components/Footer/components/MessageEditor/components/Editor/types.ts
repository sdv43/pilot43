import type {
  FileAttachment,
  PageContent,
  PageContentSelection,
} from "@pilot43/protocol"

import { type ComponentPropsWithRef } from "react"

export type EditorCommandAttachmentOption =
  | FileAttachment
  | PageContent
  | PageContentSelection
  | Pick<PageContent, "id" | "title" | "url">

export type EditorCommandType = "hash" | "slash"

export interface EditorCommandOption {
  key: string
  command: string
  disabled?: boolean
  type: EditorCommandType
  attachment?: EditorCommandAttachmentOption
}

export interface EditorParsedCommand {
  key: string
  command: string
  type: EditorCommandType
  end: number
  isError?: boolean
  start: number
  option?: EditorCommandOption
}

export interface EditorValue {
  commands: EditorParsedCommand[]
  text: string
}

export interface EditorProps extends Omit<
  ComponentPropsWithRef<"textarea">,
  "defaultValue" | "onChange" | "value"
> {
  commands: EditorCommandOption[]
  /** `caret` is set when the caret should move to a new position. */
  onValueChange?: (value: EditorValue, caret?: number) => void
  value: EditorValue
}

export interface CaretCoordinates {
  height: number
  left: number
  top: number
}
