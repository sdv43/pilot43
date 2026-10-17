import type { ComponentPropsWithRef } from "react"

export type ToggleProps = Omit<ComponentPropsWithRef<"input">, "role" | "type">
