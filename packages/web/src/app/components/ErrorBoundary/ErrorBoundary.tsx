import type { ErrorInfo } from "react"

import { Component } from "react"

import type { ErrorBoundaryProps, ErrorBoundaryState } from "./types"

import { Button } from "../Button"
import s from "./ErrorBoundary.module.css"

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
      return (
        <div className={s.errorBoundary}>
          <h1>Something went wrong.</h1>
          <div>{this.state.error.message}</div>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      )
    }

    return this.props.children
  }
}
