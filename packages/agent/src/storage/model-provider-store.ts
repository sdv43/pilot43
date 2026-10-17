import type { AgentStorage, ModelProvider } from "./types"

type ModelProviderInput = Pick<
  ModelProvider,
  "models" | "name" | "settings" | "type"
>

/**
 * Drops fields of older app versions (`maxRequestPerMinute`) from a stored
 * provider.
 */
function migrateModelProvider<P extends ModelProvider>(provider: P): P {
  const { maxRequestPerMinute: _maxRequestPerMinute, ...rest } =
    provider as P & { maxRequestPerMinute?: unknown }

  return rest as P
}

export function createModelProviderStore(storage: AgentStorage) {
  return {
    getAllModelProviders: async (): Promise<ModelProvider[]> => {
      return (await storage.modelProviders.getAll()).map(migrateModelProvider)
    },

    getModelProviderById: async (
      id: string,
    ): Promise<ModelProvider | undefined> => {
      const provider = await storage.modelProviders.getById(id)

      return provider && migrateModelProvider(provider)
    },

    createModelProvider: async (
      provider: ModelProviderInput,
    ): Promise<ModelProvider> => {
      const newProvider = migrateModelProvider({
        ...provider,
        id: crypto.randomUUID(),
      } as ModelProvider)

      await storage.modelProviders.put(newProvider)
      return newProvider
    },

    updateModelProvider: async (
      provider: ModelProvider,
    ): Promise<ModelProvider> => {
      const migrated = migrateModelProvider(provider)
      await storage.modelProviders.put(migrated)
      return migrated
    },

    deleteModelProvider: async (id: string): Promise<void> => {
      await storage.modelProviders.delete(id)
    },
  }
}
