import type { WorkspaceColor } from "@pilot43/protocol"

export interface ColorPickerProps {
  onChange: (color: WorkspaceColor) => void
  value: WorkspaceColor
}
