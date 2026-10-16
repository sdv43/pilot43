/**
 * Thrown by {@link ToolContext.askUser} when the message run is stopped (or
 * retried, or deleted) while waiting for the user's answer. The agent loop
 * catches it and ends the run as stopped.
 */
export class MessageRunStoppedError extends Error {
  constructor() {
    super("Message run was stopped.")
    this.name = "MessageRunStoppedError"
  }
}
