import { beforeEach, describe, expect, it } from "vitest"

import { RateLimiter } from "./rate-limiter"

describe("RateLimiter", () => {
  let now: number
  let clock: () => number

  beforeEach(() => {
    now = 1_000_000
    clock = () => now
  })

  it("allows requests up to the limit within the window", () => {
    const limiter = new RateLimiter(3, 60_000, clock)

    expect(limiter.isLimitReached()).toBe(false)
    expect(limiter.recordRequest()).toBe(1)
    expect(limiter.isLimitReached()).toBe(false)
    expect(limiter.recordRequest()).toBe(2)
    expect(limiter.isLimitReached()).toBe(false)
    expect(limiter.recordRequest()).toBe(3)
    expect(limiter.isLimitReached()).toBe(true)
  })

  it("reports the limit as reached as soon as the window has too many requests", () => {
    const limiter = new RateLimiter(2)

    limiter.recordRequest()
    limiter.recordRequest()

    expect(limiter.isLimitReached()).toBe(true)
  })

  it("drops requests that fall outside the sliding window", () => {
    const limiter = new RateLimiter(2, 60_000, clock)

    limiter.recordRequest() // t=0
    now += 30_000
    limiter.recordRequest() // t=30s — window now contains 2

    expect(limiter.isLimitReached()).toBe(true)

    now += 31_000 // t=61s — the first stamp is older than 60s

    expect(limiter.isLimitReached()).toBe(false)
    expect(limiter.recordRequest()).toBe(2)
  })

  it("keeps counting requests inside the window across multiple record calls", () => {
    const limiter = new RateLimiter(3, 60_000, clock)

    limiter.recordRequest()
    now += 10_000
    limiter.recordRequest()
    now += 10_000
    limiter.recordRequest()

    expect(limiter.isLimitReached()).toBe(true)

    now += 60_000

    expect(limiter.isLimitReached()).toBe(false)
  })

  it("reset clears the window so requests can start over", () => {
    const limiter = new RateLimiter(2, 60_000, clock)

    limiter.recordRequest()
    limiter.recordRequest()
    expect(limiter.isLimitReached()).toBe(true)

    limiter.reset()

    expect(limiter.isLimitReached()).toBe(false)
    expect(limiter.recordRequest()).toBe(1)
    expect(limiter.isLimitReached()).toBe(false)
  })

  it("works with the default wall-clock now and window", () => {
    const limiter = new RateLimiter(1)

    limiter.recordRequest()

    expect(limiter.isLimitReached()).toBe(true)
  })
})
