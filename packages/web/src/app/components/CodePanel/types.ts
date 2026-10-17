export interface CodePanelProps {
  className?: string
  code: string
  "data-testid"?: string
  label: string
  language?: string
  /** Collapses the code after this many lines with a "Show full …" toggle. */
  maxLines?: number
  meta?: string
  tone?: "danger" | "default"
}
