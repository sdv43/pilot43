export interface MarkdownCommandReference {
  end: number
  id: string
  start: number
}

export interface MarkdownProps {
  children: string
  className?: string
  commandReferences?: MarkdownCommandReference[]
}
