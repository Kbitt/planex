import { createStore, storeToRefs } from './create-store'
import { UseStore } from './types'

/**
 * Define a store, returning its use hook.
 * @param objectOrConstructor - The store configuration. Can be an object composed of regular POJO of properties, methods, getters and setters, or a function or constructor returning an object
 * @param options - store config options
 * @returns a hook function which returns the store instance.
 */
export function defineStore<T extends { new (): {} } | (() => {}) | {}>(
  objectOrConstructor: T
): UseStore<T> {
  let store: any | undefined = undefined

  store = createStore(objectOrConstructor)

  // registerStore(storeId, { store  })

  const useStore = (() => store) as UseStore<T>

  Object.defineProperty(useStore, '$refs', {
    get: () => storeToRefs(store),
  })

  return useStore
}
