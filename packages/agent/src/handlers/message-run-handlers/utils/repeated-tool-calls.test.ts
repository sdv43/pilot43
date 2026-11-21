import { describe, expect, it } from "vitest"

import {
  createRepeatedToolCallGuard,
  getToolCallSignature,
} from "./repeated-tool-calls"

const call = (args: string, name = "fetch") => ({
  arguments: args,
  id: "",
  name,
})

describe("createRepeatedToolCallGuard", () => {
  it("refuses a call made in the two previous round trips in a row", () => {
    const guard = createRepeatedToolCallGuard()
    const repeated = call('{"url": "a"}')

    expect(guard.nextRound([repeated])(repeated)).toBeUndefined()
    expect(guard.nextRound([repeated])(repeated)).toBeUndefined()
    expect(guard.nextRound([repeated])(repeated)).toMatch(/already made/)
  })

  it("starts over when a round trip does not repeat the call", () => {
    const guard = createRepeatedToolCallGuard()
    const repeated = call('{"url": "a"}')
    const other = call('{"url": "b"}')

    guard.nextRound([repeated])
    guard.nextRound([repeated])
    guard.nextRound([other])

    expect(guard.nextRound([repeated])(repeated)).toBeUndefined()
  })
})

describe("getToolCallSignature", () => {
  it("ignores key order and whitespace", () => {
    expect(getToolCallSignature(call('{"a": 1, "b": {"d": 2, "c": 3}}'))).toBe(
      getToolCallSignature(call('{"b":{"c":3,"d":2},"a":1}')),
    )
  })

  it("tells tools apart and keeps unparsable arguments", () => {
    expect(getToolCallSignature(call("{}", "a"))).not.toBe(
      getToolCallSignature(call("{}", "b")),
    )
    expect(getToolCallSignature(call("{oops"))).toBe('fetch:"{oops"')
  })
})
