import type { ErrorInfo } from "react"

import { Component } from "react"

import type { ErrorBoundaryProps, ErrorBoundaryState } from "./types"

import { ErrorFallback } from "./components/ErrorFallback"

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}
