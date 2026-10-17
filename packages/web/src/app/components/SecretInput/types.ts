import type { InputProps } from "../Input"

export type SecretInputProps = Omit<InputProps, "type" | "variant">
