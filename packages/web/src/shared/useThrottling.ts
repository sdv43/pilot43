/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef } from "react"

export function useThrottling<T extends (...args: any[]) => void>(
  callback: T,
  wait = 300,
) {
  const timeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null)
  const lastArgsRef = useRef<any[] | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        lastArgsRef.current = args
        return
      }

      callback(...args)

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        if (lastArgsRef.current) {
          const argsToUse = lastArgsRef.current
          lastArgsRef.current = null
          // eslint-disable-next-line react-hooks/immutability
          throttledCallback(...(argsToUse as Parameters<T>))
        }
      }, wait)
    },
    [callback, wait],
  )

  return throttledCallback
}
