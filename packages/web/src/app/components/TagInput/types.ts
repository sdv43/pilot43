export interface TagInputProps {
  "aria-label": string
  className?: string
  onChange: (tags: string[]) => void
  placeholder?: string
  tags: string[]
}
