import { describe, expect, it } from "vitest"

import { getRetryDetail } from "./utils"

describe("getRetryDetail", () => {
  it("counts down to the automatic retry", () => {
    expect(
      getRetryDetail({ attempt: 1, maxAttempts: 3, retryAt: 24_000 }, 0),
    ).toBe("Retrying automatically in 24s · attempt 1 of 3")
    expect(getRetryDetail({ retryAt: 1000 }, 2000)).toBe("Retrying…")
  })

  it("asks for a manual retry once automatic ones ran out", () => {
    expect(getRetryDetail({}, 0)).toBe(
      "Automatic retries did not help. Retry when you are ready.",
    )
  })
})
