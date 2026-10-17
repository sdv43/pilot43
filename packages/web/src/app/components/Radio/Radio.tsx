import type { RadioProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Radio.module.css"

export function Radio({ className, ...props }: RadioProps) {
  return <input className={cn(s.radio, className)} type="radio" {...props} />
}
