import type { ModelTool } from "@/shared/api"

import { getModelTools } from "../tools/registry"

export function handleModelToolGet(): Promise<ModelTool[]> {
  return Promise.resolve(getModelTools())
}
