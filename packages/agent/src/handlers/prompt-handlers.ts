import type { Prompt } from "@pilot43/protocol"

import { builtinPrompts, promptTextMaxLength } from "@pilot43/protocol"

import type { AgentContext } from "../context"

function validatePrompt(prompt: Pick<Prompt, "text" | "title">) {
  if (!prompt.title.trim()) {
    throw new Error("Prompt title is required")
  }

  if (!prompt.text.trim()) {
    throw new Error("Prompt text is required")
  }

  if (prompt.text.length > promptTextMaxLength) {
    throw new Error(
      `Prompt text must be at most ${promptTextMaxLength} characters`,
    )
  }
}

function assertNotBuiltin(id: Prompt["id"]) {
  if (builtinPrompts.some((prompt) => prompt.id === id)) {
    throw new Error("Built-in prompts cannot be changed")
  }
}

export async function handlePromptGet(ctx: AgentContext): Promise<Prompt[]> {
  return [...builtinPrompts, ...(await ctx.store.getAllPrompts())]
}

export async function handlePromptCreate(
  ctx: AgentContext,
  prompt: Pick<Prompt, "text" | "title">,
): Promise<Prompt> {
  validatePrompt(prompt)

  return await ctx.store.createPrompt({
    text: prompt.text,
    title: prompt.title.trim(),
  })
}

export async function handlePromptUpdate(
  ctx: AgentContext,
  prompt: Prompt,
): Promise<Prompt> {
  assertNotBuiltin(prompt.id)
  validatePrompt(prompt)

  return await ctx.store.updatePrompt({
    ...prompt,
    builtin: false,
    title: prompt.title.trim(),
  })
}

export async function handlePromptDelete(
  ctx: AgentContext,
  id: Prompt["id"],
): Promise<void> {
  assertNotBuiltin(id)
  await ctx.store.deletePrompt(id)
}
