import {
  CircleCheckIcon,
  CircleSlashIcon,
  CircleXIcon,
  LoaderCircleIcon,
  ShieldQuestionIcon,
  SquareIcon,
} from "lucide-react"

import type { ToolCallState } from "../../../../../../../shared/tool-call"

export const stateIcons = {
  awaiting_approval: ShieldQuestionIcon,
  completed: CircleCheckIcon,
  denied: CircleSlashIcon,
  failed: CircleXIcon,
  running: LoaderCircleIcon,
  stopped: SquareIcon,
} satisfies Record<ToolCallState, unknown>
