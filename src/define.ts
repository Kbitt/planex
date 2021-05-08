import { computed, reactive, ref, watchEffect } from '@vue/composition-api'
import { MutationTree } from 'vuex'
import { planexLog } from './logging'
import { getStore, usingVuex } from './store'
import { DefineOptions, MappedRefs, ResultType, UseStore } from './types'
import {
  defaultObjectNames,
  getAllPropertyNames,
  getNearestPropertyDescriptor,
} from './util'

const defStore = <T extends {}>(
  options: T,
  id: string
): [
  MappedRefs<T>,
  { stateKeys: string[]; getterKeys: string[]; actionKeys: string[] }
] => {
  const store = options as any
  const def = {} as any
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
      const value = (...args: any) => {
        return new Promise<void>(resolve => {
          setTimeout(() => {
            const result = property.value.call(store, ...args)
            Promise.resolve(result).then(resolve)
          })
        })
      }
      ;[options, def].forEach(target =>
        Object.defineProperty(target, key, {
          enumerable: true,
          configurable: true,
          value,
        })
      )
      return
      // computed
    } else if (property.get) {
      getterKeys.push(key)
      if (property.set) {
        planexLog(`(${id}) ${key} is computed`)
        const value = computed({
          get: () => property.get!.call(store),
          set: value => property.set!.call(store, value),
        })
        ;[options, def].forEach(target => {
          Object.defineProperty(target, key, {
            enumerable: true,
            configurable: true,
            value,
          })
        })
      } else {
        planexLog(`(${id}) ${key} is getter`)
        const value = computed(() => property.get!.call(store))
        ;[options, def].forEach(target =>
          Object.defineProperty(target, key, {
            enumerable: true,
            configurable: true,
            value,
          })
        )
      }
      // state
    } else {
      planexLog(`(${id}) ${key} is state`)

      stateKeys.push(key)
      const value = ref(property.value)
      ;[options, def].forEach(target =>
        Object.defineProperty(store, key, {
          enumerable: true,
          configurable: true,
          value,
        })
      )
    }
  })

  return [def, { stateKeys, getterKeys, actionKeys }]
}

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

  planexLog(`(${storeId}) creating reactive store instance`)
  store = reactive(instance) as ReturnType<UseStore<T>>

  const useStore = (() => {
    if (usingVuex() && options.id !== false && !vuexPropogated) {
      propogateToVuex(storeId, store, stateKeys, getterKeys)
      vuexPropogated = true
    }
    return store
  }) as UseStore<T>

  let computed: any

  useStore.$refs = def

  useStore.$mapComputed = () => {
    if (computed) {
      return { ...computed }
    }
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
    const methods = {} as any
    actionKeys.forEach(key => {
      methods[key] = store[key].bind(store)
    })
    return methods
  }

  if (isClass) {
    ;(useStore as any).$class = objectOrConstructor
  }

  return useStore
}
