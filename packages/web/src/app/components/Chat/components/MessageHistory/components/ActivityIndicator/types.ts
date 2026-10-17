export interface ActivityIndicatorProps {
  label: string
  /** `dots` while thinking or waiting, `spinner` while calling tools. */
  type?: "dots" | "spinner"
}
