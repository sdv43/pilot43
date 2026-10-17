export interface ConnectionResultProps {
  /** Names listed as chips (models or tools). */
  items?: string[]
  isTesting?: boolean
  message: string
  onRetest?: () => void
  success: boolean
}
