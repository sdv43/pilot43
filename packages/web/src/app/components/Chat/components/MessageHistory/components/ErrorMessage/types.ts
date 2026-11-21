export interface ErrorMessageProps {
  error: string
  isRetrying?: boolean
  onRetry?: () => void
  /** Continues the run from where it failed (see `canResumeRun`). */
  onResume?: () => void
}
