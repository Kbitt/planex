import { computed, reactive, ref, watchEffect } from '@vue/composition-api'
import { MutationTree, Store } from 'vuex'
import { getStore, usingVuex } from './store'

function getAllPropertyNames(obj: any) {
  const props: string[] = []

  do {
    Object.getOwnPropertyNames(obj).forEach(function (prop) {
      if (props.indexOf(prop) === -1) {
        props.push(prop)
      }
    })
  } while ((obj = Object.getPrototypeOf(obj)))

  return props
}

function getNearestPropertyDescriptor(obj: any, key: string) {
  while (obj) {
    const property = Object.getOwnPropertyDescriptor(obj, key)
    if (property) {
      return property
    }
    obj = Object.getPrototypeOf(obj)
  }
}

const defaultObjectNames = new Set<string>(
  Object.getOwnPropertyNames(Object.getPrototypeOf({}))
)

type Equals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B

/**
 * Get all keys for the given type that are writable.
 */
type WritableKeys<Type> = {
  [Key in keyof Type]-?: Equals<
    { [K in Key]: Type[Key] },
    { -readonly [K in Key]: Type[Key] },
    Key
  >
}[keyof Type]

/**
 * Get all keys for the given type that are readonly.
 */
type ReadonlyKeys<Type> = {
  [Key in keyof Type]-?: Equals<
    { [K in Key]: Type[Key] },
    { -readonly [Q in Key]: Type[Key] },
    never,
    Key
  >
}[keyof Type]

type FunctionKeys<T> = {
  [P in keyof T]-?: T[P] extends (...args: any) => any ? P : never
}[keyof T]

type NonFunctionKeys<T> = {
  [P in keyof T]-?: T[P] extends (...args: any) => any ? never : P
}[keyof T]

type StateKeys<T> = {
  [Key in keyof T]: Key extends WritableKeys<T>
    ? Key extends NonFunctionKeys<T>
      ? Key
      : never
    : never
}[keyof T]

type ExtractState<T> = Pick<T, StateKeys<T>>

type GetterKeys<T> = keyof Omit<T, WritableKeys<T>>

type ExtractGetters<T> = Pick<T, ReadonlyKeys<T>>

type ExtractActions<T> = Pick<T, FunctionKeys<T>>

type StateSubscriber<T> = (state: ExtractState<T>) => void
type GetterSubscriber<T> = (getters: ExtractGetters<T>) => void

const defStore = <T extends {}>(
  options: T
): [T, { stateKeys: string[]; getterKeys: string[]; actionKeys: string[] }] => {
  const store = options as any
  const stateKeys: string[] = []
  const getterKeys: string[] = []
  const actionKeys: string[] = []

  const properties = getAllPropertyNames(options)

  properties
    .filter(key => !defaultObjectNames.has(key))
    .forEach(key => {
      const property = getNearestPropertyDescriptor(options, key)
      if (!property) return
      // action
      if (typeof property.value === 'function') {
        actionKeys.push(key)
        Object.defineProperty(store, key, {
          enumerable: true,
          value: property.value.bind(store),
        })
        return
        // computed
      } else if (property.get) {
        getterKeys.push(key)
        if (property.set) {
          const c = computed({
            get: () => property.get!.call(store),
            set: value => property.set!.call(store, value),
          })
          Object.defineProperty(store, key, {
            enumerable: true,
            get: () => c.value,
            set: value => (c.value = value),
          })
        } else {
          const c = computed(() => property.get!.call(store))
          Object.defineProperty(store, key, {
            enumerable: true,
            get: () => c.value,
          })
        }
        // state
      } else {
        stateKeys.push(key)
        const refValue = ref(property.value)
        Object.defineProperty(store, key, {
          enumerable: true,
          get: () => refValue.value,
          set: value => (refValue.value = value),
        })
      }
    })

  return [store, { stateKeys, getterKeys, actionKeys }]
}

const filter = (obj: any, keys: string[]) =>
  keys.reduce((result: any, next: any) =>
    Object.assign(
      typeof result === 'string' ? { [result as string]: obj[result] } : result,
      { [next]: obj[next] }
    )
  )

function propogateToVuex(
  id: string,
  store: any,
  stateKeys: string[],
  getterKeys: string[]
) {
  const mutations: MutationTree<any> = {}
  const vuexStore = getStore()

  ;([
    ['state', stateKeys],
    ['getters', getterKeys],
  ] as [string, string[]][]).forEach(([type, keys]) => {
    keys.forEach(key => {
      const m = `set_${type}_${key}`
      mutations[m] = (state, payload) => {
        state[type][key] = payload
      }
    })
  })

  vuexStore.registerModule(id.split('/'), {
    namespaced: true,
    state: () => ({
      state: {},
      getters: {},
    }),
    mutations,
  })
  ;([
    ['state', stateKeys],
    ['getters', getterKeys],
  ] as [string, string[]][]).forEach(([type, keys]) => {
    keys.forEach(key => {
      const m = `set_${type}_${key}`
      watchEffect(() => {
        const s = (store as any)[key]
        vuexStore.commit(`${id}/${m}`, s)
      })
    })
  })
}

type ResultType<T> = T extends { new (): infer R }
  ? R
  : T extends () => infer R
  ? R
  : T extends {}
  ? T
  : never

let uid = 1

const nextId = () => '' + uid++

export type MappedComputedState<Type> = {
  [Key in StateKeys<Type>]: {
    get: () => Type[Key]
    set: (value: Type[Key]) => void
  }
}

export type MappedComputedGetters<Type> = {
  [Key in GetterKeys<Type>]: () => Type[Key]
}

export type MappedMethods<Type> = {
  [Key in FunctionKeys<Type>]: Type[Key]
}

/**
 * Extra store configuration options
 */
export type DefineOptions = {
  /**
   * Sets the store's ID, which will be used for a generated Vuex module (if enabled)
   * If set to `false`, then Vuex integration with be disabled for this store (if it is enabled via plugin config.)
   */

  id?: string | false
}

export type Mapper<T> = {
  [P in keyof T]?: string
}

export type UseStore<T> = {
  (): ResultType<T>
  $mapComputed(): MappedComputedState<ResultType<T>> &
    MappedComputedGetters<ResultType<T>>
  $mapMethods(): MappedMethods<ResultType<T>>
} & (T extends { new (): {} } ? { $class: T } : {})

/**
 * Define a store, returning its use hook.
 * @param objectOrConstructor - The store configuration. Can be an object composed of regular POJO of properties, methods, getters and setters, or a function or constructor returning an object
 * @param options - store config options
 * @returns a hook function which returns the store instance.
 */
export function defineStore<T extends { new (): {} } | (() => {}) | {}>(
  objectOrConstructor: T,
  options: DefineOptions = {}
): UseStore<T> {
  const { id } = options
  let store: any | undefined = undefined

  let stateKeys: string[], getterKeys: string[], actionKeys: string[]

  let isClass = false
  const getInstance = <T extends { new (): {} } | (() => {}) | {}>(
    objectOrConstructor: T
  ): ResultType<T> => {
    if (typeof objectOrConstructor === 'object') {
      return objectOrConstructor as ResultType<T>
    }

    if (typeof objectOrConstructor === 'function') {
      const fn = objectOrConstructor as Function
      try {
        const instance = new (fn as any)() as ResultType<T>
        isClass = true
        return instance
      } catch (_) {
        return fn() as ResultType<T>
      }
    }

    throw new Error('Unexpected option type: ' + typeof objectOrConstructor)
  }

  const instance = getInstance(objectOrConstructor)

  const useStore = (() => {
    if (store) {
      return store
    }

    const [def, keys] = defStore(instance)
    stateKeys = keys.stateKeys
    getterKeys = keys.getterKeys
    actionKeys = keys.actionKeys

    store = reactive(def) as ReturnType<UseStore<T>>

    if (usingVuex() && id !== false) {
      propogateToVuex(id ?? nextId(), store, stateKeys, getterKeys)
    }

    return store!
  }) as UseStore<T>

  let computed: any

  useStore.$mapComputed = () => {
    if (computed) {
      return { ...computed }
    }
    const store = useStore() as any
    computed = {} as any
    stateKeys.forEach(key => {
      computed[key] = () => store[key]
    })
    getterKeys.forEach(key => {
      computed[key] = () => store[key]
    })
    return computed
  }

  useStore.$mapMethods = () => {
    const store = useStore() as any
    const methods = {} as any
    actionKeys.forEach(key => {
      methods[key] = (store as any)[key].bind(store)
    })
    return methods
  }

  if (isClass) {
    ;(useStore as any).$class = objectOrConstructor
  }

  return useStore
}
