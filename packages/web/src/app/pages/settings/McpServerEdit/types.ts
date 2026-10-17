export interface HeaderEntry {
  id: string
  name: string
  value: string
}

export interface McpServerDraft {
  headers: HeaderEntry[]
  name: string
  url: string
}
