import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"

import { cn } from "@/sidepanel/shared/cn"

import type { MarkdownProps } from "./types"

import { CodeBlock } from "./components/CodeBlock"
import s from "./Markdown.module.css"
import { getMarkdownRemarkPlugins } from "./utils"

import "katex/dist/katex.min.css"

export function Markdown({
  children,
  className,
  commandReferences,
}: MarkdownProps) {
  return (
    <div className={cn(s.markdownContainer, className)}>
      <ReactMarkdown
        components={{
          pre({ children }) {
            // For multiline code blocks, react-markdown wraps <code> in <pre>.
            // We return a fragment here because our CodeBlock component handles its own container.
            return <>{children}</>
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const childList = Array.isArray(children) ? children : [children]
            const code = childList
              .map((child) => (typeof child === "string" ? child : ""))
              .join("")
              .replace(/\n$/, "")

            // In react-markdown v9, the 'inline' prop is removed.
            // We use the presence of a language class or newlines as a signal for a code block.
            const isBlock = match || code.includes("\n")

            if (isBlock) {
              return (
                <CodeBlock
                  code={code}
                  language={match ? match[1] : undefined}
                />
              )
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={getMarkdownRemarkPlugins(
          commandReferences,
          s.commandToken,
        )}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
