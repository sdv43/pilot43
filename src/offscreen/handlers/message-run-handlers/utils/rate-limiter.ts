/**
 * Sliding-window rate limiter used to enforce per-minute request limits for
 * model providers during message-run generation.
 *
 * `recordRequest()` stamps the current time and prunes stamps older than the
 * window (60s), then `isLimitReached()` reports whether the number of
 * requests inside the window has reached the limit. `reset()` clears the
 * window, which the generation loop uses when it pauses the run to ask the
 * user whether to keep going — effectively granting another full batch of
 * requests.
 */
export class RateLimiter {
  private readonly windowMs: number
  private readonly limit: number
  private readonly timestamps: number[] = []
  private now: () => number

  constructor(limit: number, windowMs = 60_000, now: () => number = Date.now) {
    this.limit = limit
    this.windowMs = windowMs
    this.now = now
  }

  /**
   * Records a request timestamp and prunes stamps that fall outside the
   * sliding window. Returns the number of requests visible in the window
   * after recording, including the new one.
   */
  recordRequest(): number {
    const now = this.now()
    this.prune(now)
    this.timestamps.push(now)
    return this.timestamps.length
  }

  /**
   * Returns whether the request count in the current sliding window has
   * reached the limit. Prunes expired stamps first so a request that fell
   * out of the window no longer counts.
   */
  isLimitReached(now = this.now()): boolean {
    this.prune(now)
    return this.timestamps.length >= this.limit
  }

  /**
   * Empties the sliding window so the next `recordRequest()` starts a fresh
   * window.
   */
  reset(): void {
    this.timestamps.length = 0
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs
    while (this.timestamps.length > 0 && this.timestamps[0] <= cutoff) {
      this.timestamps.shift()
    }
  }
}
