import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import type { MarkdownCommandReference } from "./types"

interface MarkdownPositionPoint {
  offset?: number
}

interface MarkdownPosition {
  end?: MarkdownPositionPoint
  start?: MarkdownPositionPoint
}

interface MarkdownNode {
  children?: MarkdownNode[]
  data?: {
    hName?: string
    hProperties?: Record<string, unknown>
  }
  position?: MarkdownPosition
  type: string
  value?: string
}

function createTextNode(value: string): MarkdownNode {
  return {
    type: "text",
    value,
  }
}

function createCommandTokenNode(
  value: string,
  reference: MarkdownCommandReference,
  commandTokenClassName: string,
): MarkdownNode {
  return {
    children: [createTextNode(value)],
    data: {
      hName: "span",
      hProperties: {
        className: [commandTokenClassName],
        "data-command-key": reference.id,
        "data-has-option": "true",
        "data-testid": "user-message-command-token",
      },
    },
    type: "commandToken",
  }
}

function getNodeOffsets(node: MarkdownNode): null | {
  end: number
  start: number
} {
  const start = node.position?.start?.offset
  const end = node.position?.end?.offset

  if (start === undefined || end === undefined) {
    return null
  }

  return { end, start }
}

function normalizeCommandReferences(
  commandReferences: MarkdownCommandReference[] | undefined,
): MarkdownCommandReference[] {
  return (commandReferences ?? [])
    .filter(
      (reference) => reference.start >= 0 && reference.end > reference.start,
    )
    .sort((left, right) => left.start - right.start || left.end - right.end)
}

function splitTextNode(
  node: MarkdownNode,
  commandReferences: MarkdownCommandReference[],
  commandTokenClassName: string,
): MarkdownNode[] {
  if (node.type !== "text" || typeof node.value !== "string") {
    return [node]
  }

  const offsets = getNodeOffsets(node)

  if (!offsets) {
    return [node]
  }

  const referencesInNode = commandReferences.filter(
    (reference) =>
      reference.start >= offsets.start && reference.end <= offsets.end,
  )

  if (referencesInNode.length === 0) {
    return [node]
  }

  const nextNodes: MarkdownNode[] = []
  let cursor = 0

  for (const reference of referencesInNode) {
    const localStart = reference.start - offsets.start
    const localEnd = reference.end - offsets.start

    if (
      localStart < cursor ||
      localStart < 0 ||
      localEnd <= localStart ||
      localEnd > node.value.length
    ) {
      continue
    }

    if (localStart > cursor) {
      nextNodes.push(createTextNode(node.value.slice(cursor, localStart)))
    }

    nextNodes.push(
      createCommandTokenNode(
        node.value.slice(localStart, localEnd),
        reference,
        commandTokenClassName,
      ),
    )
    cursor = localEnd
  }

  if (cursor < node.value.length) {
    nextNodes.push(createTextNode(node.value.slice(cursor)))
  }

  return nextNodes.length > 0 ? nextNodes : [node]
}

function highlightCommandReferences(
  node: MarkdownNode,
  commandReferences: MarkdownCommandReference[],
  commandTokenClassName: string,
) {
  if (!node.children || node.children.length === 0) {
    return
  }

  node.children = node.children.flatMap((child) => {
    if (child.children && child.children.length > 0) {
      highlightCommandReferences(
        child,
        commandReferences,
        commandTokenClassName,
      )
      return [child]
    }

    return splitTextNode(child, commandReferences, commandTokenClassName)
  })
}

function createCommandHighlightPlugin(
  commandReferences: MarkdownCommandReference[] | undefined,
  commandTokenClassName: string,
) {
  const normalizedCommandReferences =
    normalizeCommandReferences(commandReferences)

  return function commandHighlightPlugin() {
    return function transform(tree: MarkdownNode) {
      if (normalizedCommandReferences.length === 0) {
        return
      }

      highlightCommandReferences(
        tree,
        normalizedCommandReferences,
        commandTokenClassName,
      )
    }
  }
}

export function getMarkdownRemarkPlugins(
  commandReferences: MarkdownCommandReference[] | undefined,
  commandTokenClassName: string,
) {
  return [
    remarkGfm,
    remarkMath,
    remarkBreaks,
    createCommandHighlightPlugin(commandReferences, commandTokenClassName),
  ]
}
