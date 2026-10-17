export interface ErrorMessageProps {
  error: string
  isRetrying?: boolean
  onRetry?: () => void
}
