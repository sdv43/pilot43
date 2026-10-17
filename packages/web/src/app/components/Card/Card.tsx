import { cn } from "../../../shared/cn"
import s from "./Card.module.css"
import { type CardProps } from "./types"

/** Bordered group of rows separated by dividers, as used throughout Settings. */
export function Card({ className, ...props }: CardProps) {
  return <div className={cn(s.card, className)} {...props} />
}
