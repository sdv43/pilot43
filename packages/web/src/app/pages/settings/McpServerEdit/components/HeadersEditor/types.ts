import type { HeaderEntry } from "../../types"

export interface HeadersEditorProps {
  headers: HeaderEntry[]
  onChange: (headers: HeaderEntry[]) => void
}
