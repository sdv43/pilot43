import {
  CircleCheckIcon,
  CircleSlashIcon,
  CircleXIcon,
  LoaderCircleIcon,
  ShieldQuestionIcon,
} from "lucide-react"

import type { ToolCallState } from "../../../../../../../shared/tool-call"

export const stateIcons = {
  awaiting_approval: ShieldQuestionIcon,
  completed: CircleCheckIcon,
  denied: CircleSlashIcon,
  failed: CircleXIcon,
  running: LoaderCircleIcon,
} satisfies Record<ToolCallState, unknown>
