import { createStore, storeToRefs } from './create-store'
import { UseStore } from './types'

/**
 * Create a store composable from a setup function
 * @param setup Function return reactive properties and methods
 * @param options
 */
export function defineStore<T extends object>(
  setup: () => T,
  options?: any
): UseStore<T>
/**
 * Create a store composable from a class constructor.
 * @param ctor A class constructor to use as a template for the store composable.
 * @param options
 */
export function defineStore<T extends object>(
  ctor: { new (): T },
  options?: any
): UseStore<T>
/**
 * Create a store composable from an object.
 * @param o Object template to create store from.
 * @param options
 */
export function defineStore<T extends object>(o: T, options?: any): UseStore<T>
/**
 * Define a store, returning its use hook.
 * @param objectOrConstructor - The store configuration. Can be an object composed of regular POJO of properties, methods, getters and setters, or a function or constructor returning an object
 * @param options - store config options
 * @returns a hook function which returns the store instance.
 */
export function defineStore<T extends object>(
  objectOrConstructor: { new (): T } | (() => T) | T,
  options?: any
): UseStore<T> {
  let store: any | undefined = undefined

  store = createStore(objectOrConstructor)

  // registerStore(storeId, { store  })

  const useStore = (() => store) as UseStore<T>

  let refs: any

  Object.defineProperty(useStore, '$refs', {
    get: () => refs || (refs = storeToRefs(store)),
  })

  return useStore
}
