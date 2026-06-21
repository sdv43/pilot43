import { type LucideProps } from "lucide-react"
import { LoaderCircleIcon } from "lucide-react"

import { cn } from "@/sidepanel/shared/cn"

import s from "./Loader.module.css"

export type LoaderProps = LucideProps

export function Loader({ className, ...props }: LoaderProps) {
  return <LoaderCircleIcon className={cn(s.loader, className)} {...props} />
}
