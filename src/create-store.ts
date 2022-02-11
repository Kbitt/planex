import { computed, ComputedRef, markRaw, reactive, Ref, toRefs } from 'vue-demi'
import { ActionKeys, UnwrapSetupRefs, WritableKeys } from './types'
import { getAllPropertyNames, getNearestPropertyDescriptor } from './util'

const PROPS = Symbol('PROPS')

interface StoreWithProps {
  [PROPS]: {
    methodKeys: string[]
  }
}

/**
 * Create a store instance.
 * @param setup A setup function to create the store from (just like Vue composition API setup)
 */
function createStore<T extends object>(setup: () => T): UnwrapSetupRefs<T>
/**
 * Create a store from a class constructor. Properties are state, getters and setters are computed, methods are methods.
 * @param ctor A store constructor
 */
function createStore<T extends object>(ctor: { new (): T }): UnwrapSetupRefs<T>
/**
 * Create a store from a object literal. Properties are state, getters and setters are computed, methods are methods.
 * @param object A store object
 */
function createStore<T extends object>(object: T): UnwrapSetupRefs<T>
function createStore<T extends object>(input: { new (): T } | (() => T) | T) {
  let instance: any

  if (typeof input === 'function') {
    try {
      instance = new (input as { new (): T })()
    } catch (_) {
      instance = (input as Function)()
    }
  } else {
    instance = input
  }
  const methodKeys: string[] = []

  getAllPropertyNames(instance).forEach(key => {
    const prop = getNearestPropertyDescriptor(instance, key)
    if (!prop) return
    if (prop.get && prop.set) {
      Object.defineProperty(instance, key, {
        configurable: true,
        enumerable: true,
        value: computed({
          get: () => prop.get!.call(reactiveInstance),
          set: value => prop.set!.call(reactiveInstance, value),
        }),
      })
    } else if (prop.get) {
      Object.defineProperty(instance, key, {
        configurable: true,
        enumerable: true,
        value: computed(() => prop.get!.call(reactiveInstance)),
      })
    } else if (typeof prop.value === 'function') {
      methodKeys.push(key)
      Object.defineProperty(instance, key, {
        value: markRaw((...args: any) => {
          return (prop.value as Function).call(reactiveInstance, ...args)
        }),
      })
    }
  })

  const storeProperties = markRaw({
    methodKeys,
  })

  Object.assign(instance, { [PROPS]: storeProperties })

  const reactiveInstance = reactive(instance)

  return reactiveInstance
}

export type ToStoreRefs<T extends object> = {
  [Key in keyof T]: Key extends ActionKeys<T>
    ? T[Key]
    : Key extends WritableKeys<T>
    ? Ref<T[Key]>
    : ComputedRef<T[Key]>
}

/**
 * Create a map of refs from store properties. Methods are not turned into refs.
 * @param store The store to create refs from
 * @returns
 */
const storeToRefs = <T extends object>(store: T): ToStoreRefs<T> => {
  if (!(PROPS in store)) {
    throw new Error('Expected a store created with createStore or defineStore')
  }
  const refs = toRefs(store)

  const storeWithProps = store as StoreWithProps

  storeWithProps[PROPS].methodKeys.forEach(key => {
    ;(refs as any)[key] = (...args: any) => (store as any)[key](...args)
  })

  return refs as any
}

export { storeToRefs, createStore }
