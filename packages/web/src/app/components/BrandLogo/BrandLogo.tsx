import { GlobeIcon } from "lucide-react"
import { useState } from "react"

import type { BrandLogoProps } from "./types"
import type { Brand } from "./utils"

import { cn } from "../../../shared/cn"
import anthropic from "./assets/anthropic.png"
import figma from "./assets/figma.png"
import github from "./assets/github.png"
import linear from "./assets/linear.jpg"
import ollama from "./assets/ollama.png"
import openai from "./assets/openai.png"
import openrouter from "./assets/openrouter.png"
import s from "./BrandLogo.module.css"

const brandSources: Record<Brand, string> = {
  anthropic,
  figma,
  github,
  linear,
  ollama,
  openai,
  openrouter,
}

/**
 * Logo tile for providers, model makers, MCP servers and tabs (Figma
 * "Logos" frame). Unknown brands show a generic icon on a neutral tile.
 */
export function BrandLogo({
  brand,
  className,
  fallback: Fallback = GlobeIcon,
  size = 20,
  src,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false)
  const image = (!failed && src) || (brand ? brandSources[brand] : undefined)

  return (
    <span
      aria-hidden="true"
      className={cn(s.logo, className)}
      data-kind={image ? "image" : "fallback"}
      style={{ "--logo-size": `${size}px` } as React.CSSProperties}
    >
      {image ? (
        <img alt="" src={image} onError={() => setFailed(true)} />
      ) : (
        <Fallback />
      )}
    </span>
  )
}
