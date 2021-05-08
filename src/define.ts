import { computed, reactive, ref, watchEffect } from '@vue/composition-api'
import { MutationTree } from 'vuex'
import { planexLog } from './logging'
import { getStore, usingVuex } from './store'
import {
  DefineOptions,
  MappedComputedGetters,
  MappedComputedState,
  MappedMethods,
  ResultType,
} from './types'
import {
  defaultObjectNames,
  getAllPropertyNames,
  getNearestPropertyDescriptor,
} from './util'

const defStore = <T extends {}>(
  options: T,
  id: string
): [T, { stateKeys: string[]; getterKeys: string[]; actionKeys: string[] }] => {
  const store = options as any
  const stateKeys: string[] = []
  const getterKeys: string[] = []
  const actionKeys: string[] = []

  const properties = getAllPropertyNames(options).filter(
    key => !defaultObjectNames.has(key)
  )

  properties.forEach(key => {
    planexLog(`(${id}) configuring key: ${key}`)
    const property = getNearestPropertyDescriptor(options, key)
    if (!property) {
      planexLog(`(${id}) no property for ${key} (skip)`)
      return
    }
    // action
    if (typeof property.value === 'function') {
      planexLog(`(${id}) ${key} is action`)
      actionKeys.push(key)
      Object.defineProperty(store, key, {
        enumerable: true,
        configurable: true,
        value: property.value.bind(store),
      })
      return
      // computed
    } else if (property.get) {
      getterKeys.push(key)
      if (property.set) {
        planexLog(`(${id}) ${key} is computed`)
        Object.defineProperty(store, key, {
          enumerable: true,
          configurable: true,
          value: computed({
            get: () => property.get!.call(store),
            set: value => property.set!.call(store, value),
          }),
        })
      } else {
        planexLog(`(${id}) ${key} is getter`)
        Object.defineProperty(store, key, {
          enumerable: true,
          configurable: true,
          value: computed(() => property.get!.call(store)),
        })
      }
      // state
    } else {
      planexLog(`(${id}) ${key} is state`)
      stateKeys.push(key)
      Object.defineProperty(store, key, {
        enumerable: true,
        configurable: true,
        value: ref(property.value),
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
  if (vuexStore.hasModule(id.split('/'))) return
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

let uid = 1

const nextId = () => '' + uid++

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
  const storeId = options.id || nextId()
  let store: any | undefined = undefined

  let stateKeys: string[], getterKeys: string[], actionKeys: string[]

  let isClass = false
  const getInstance = <T extends { new (): {} } | (() => {}) | {}>(
    objectOrConstructor: T
  ): ResultType<T> => {
    if (typeof objectOrConstructor === 'object') {
      planexLog('Received object config')
      return objectOrConstructor as ResultType<T>
    }

    if (typeof objectOrConstructor === 'function') {
      const fn = objectOrConstructor as Function
      try {
        const instance = new (fn as any)() as ResultType<T>
        planexLog('Received class config')
        isClass = true
        return instance
      } catch (_) {
        planexLog('Received function config')
        return fn() as ResultType<T>
      }
    }

    throw new Error('Unexpected option type: ' + typeof objectOrConstructor)
  }

  const instance = getInstance(objectOrConstructor)

  let vuexPropogated = false

  planexLog(`(${storeId}) creating store definition`)
  const [def, keys] = defStore(instance, storeId)
  stateKeys = keys.stateKeys
  getterKeys = keys.getterKeys
  actionKeys = keys.actionKeys
  store = def

  planexLog(`(${storeId}) creating reactive store instance`)
  store = reactive(store) as ReturnType<UseStore<T>>

  const useStore = (() => {
    if (usingVuex() && options.id !== false && !vuexPropogated) {
      propogateToVuex(storeId, store, stateKeys, getterKeys)
      vuexPropogated = true
    }
    return store
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
