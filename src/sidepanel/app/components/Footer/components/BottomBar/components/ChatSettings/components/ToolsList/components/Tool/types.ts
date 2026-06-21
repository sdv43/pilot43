import type { ToolItem } from "../../types"

export interface ToolProps {
  isEnabled: boolean
  onChange: (isEnabled: boolean) => void
  tool: ToolItem
}
