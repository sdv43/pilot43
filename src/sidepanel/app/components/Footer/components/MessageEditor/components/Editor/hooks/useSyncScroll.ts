import { type RefObject, useCallback } from "react"

export function useSyncScroll(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  underlayRef: RefObject<HTMLDivElement | null>,
) {
  const syncScroll = useCallback(() => {
    if (textareaRef.current && underlayRef.current) {
      underlayRef.current.scrollTop = textareaRef.current.scrollTop
      underlayRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [textareaRef, underlayRef])

  return syncScroll
}
