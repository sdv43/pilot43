import {
  FileIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  TextSelectIcon,
} from "lucide-react"

import type { AttachmentKind } from "./types"

export const attachmentKindIcons = {
  document: FileTextIcon,
  file: FileIcon,
  image: ImageIcon,
  selection: TextSelectIcon,
  tab: GlobeIcon,
} satisfies Record<AttachmentKind, unknown>
