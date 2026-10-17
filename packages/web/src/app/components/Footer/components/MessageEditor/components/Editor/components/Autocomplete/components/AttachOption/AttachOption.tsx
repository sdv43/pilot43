import { FileIcon, GlobeIcon, TextSelectIcon } from "lucide-react"

import {
  isPageCommand,
  isSelectionCommand,
} from "../../../../../../../../utils"
import s from "./AttachOption.module.css"
import { type AttachOptionProps } from "./types"
import { describeAttachOption } from "./utils"

/** A tab, selection or file in the `#` menu. */
export function AttachOption({ isSelected, option }: AttachOptionProps) {
  const { detail, title } = describeAttachOption(option)
  const Icon = isSelectionCommand(option.key)
    ? TextSelectIcon
    : isPageCommand(option.key)
      ? GlobeIcon
      : FileIcon

  return (
    <span className={s.attachOption} data-selected={isSelected}>
      <Icon aria-hidden="true" className={s.icon} />
      <span className={s.text}>
        <span className={s.title}>{title}</span>
        {detail ? <span className={s.detail}>{detail}</span> : null}
      </span>
    </span>
  )
}
