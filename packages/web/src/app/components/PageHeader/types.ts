import type { ReactNode } from "react"

export interface PageHeaderProps {
  action?: ReactNode
  backLabel?: string
  children?: ReactNode
  className?: string
  onBack?: () => void
  subtitle?: ReactNode
  title: ReactNode
}
