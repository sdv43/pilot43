import { type Ref } from "react"

export function assignRef<T>(ref: Ref<T> | undefined, value: null | T) {
  if (ref == null) {
    return
  }

  if (typeof ref === "function") {
    ref(value)
    return
  }

  ref.current = value
}

export function mergeRef<T>(...refs: (Ref<T> | undefined)[]) {
  return (value: null | T) => {
    refs.forEach((ref) => {
      assignRef(ref, value)
    })
  }
}
