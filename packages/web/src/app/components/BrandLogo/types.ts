import type { LucideIcon } from "lucide-react"

import type { Brand } from "./utils"

export interface BrandLogoProps {
  brand: Brand | null
  className?: string
  /** Icon drawn on a neutral tile when there is no brand logo. */
  fallback?: LucideIcon
  /** Favicon URL from the browser (tabs); preferred over `brand`. */
  src?: string
  /** Square size in px. Defaults to 20. */
  size?: number
}
