import type {
  SandboxParentRequestMessage,
  SandboxParentResponseMessage,
  SandboxWorkerRequestMessage,
  SandboxWorkerResponseMessage,
} from "../types"

import {
  sandboxRequestType,
  sandboxResponseType,
  sandboxWorkerRequestType,
  sandboxWorkerResponseType,
} from "../const"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isSandboxParentRequestMessage(
  value: unknown,
): value is SandboxParentRequestMessage {
  return (
    isRecord(value) &&
    value.source === "pilot43-offscreen" &&
    value.type === sandboxRequestType &&
    typeof value.id === "string" &&
    isRecord(value.payload) &&
    typeof value.payload.code === "string" &&
    typeof value.payload.timeoutMs === "number"
  )
}

export function isSandboxParentResponseMessage(
  value: unknown,
): value is SandboxParentResponseMessage {
  return (
    isRecord(value) &&
    value.source === "pilot43-sandbox" &&
    value.type === sandboxResponseType &&
    typeof value.id === "string" &&
    isRecord(value.payload) &&
    typeof value.payload.ok === "boolean"
  )
}

export function isSandboxWorkerRequestMessage(
  value: unknown,
): value is SandboxWorkerRequestMessage {
  return (
    isRecord(value) &&
    value.type === sandboxWorkerRequestType &&
    typeof value.id === "string" &&
    isRecord(value.payload) &&
    typeof value.payload.code === "string"
  )
}

export function isSandboxWorkerResponseMessage(
  value: unknown,
): value is SandboxWorkerResponseMessage {
  return (
    isRecord(value) &&
    value.type === sandboxWorkerResponseType &&
    typeof value.id === "string" &&
    isRecord(value.payload) &&
    typeof value.payload.ok === "boolean"
  )
}
