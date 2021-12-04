import { reactive } from '@vue/composition-api'
import { Module, Store } from 'vuex'
import { defineAction } from './action'
import { defineComputed } from './computed'
import { get } from './getset'
import { planexLog } from './logging'
import { defineState } from './state'
import { getStore, usingVuex } from './store'
import { DefineOptions, MappedRefs, ResultType, UseStore } from './types'
import { getAllPropertyNames, getNearestPropertyDescriptor } from './util'

const defStore = <T extends {}>(
  options: T,
  id: string,
  getThis: () => T,
  getVuexStore?: () => Store<any>
): [
  MappedRefs<T>,
  { stateKeys: string[]; getterKeys: string[]; actionKeys: string[] },
  Module<any, any> | undefined
] => {
  // const store = options as any
  const def = {} as any
  const stateKeys: string[] = []
  const getterKeys: string[] = []
  const actionKeys: string[] = []
  const vuexOptions = getVuexStore
    ? {
        module: { namespaced: true } as Module<any, any>,
        getStore: getVuexStore,
      }
    : undefined

  const properties = getAllPropertyNames(options)

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
      const value = defineAction(
        id,
        key,
        (...args: any) => property.value.call(getThis(), ...args),
        vuexOptions
      )
      ;[options, def].forEach(target =>
        Object.defineProperty(target, key, {
          enumerable: true,
          configurable: true,
          value,
        })
      )
      // computed
    } else if (property.get) {
      getterKeys.push(key)
      ;[options, def].forEach(target => {
        const value = defineComputed(
          id,
          key,
          () => property.get!.call(getThis()),
          property.set ? val => property.set?.call(getThis(), val) : undefined,
          vuexOptions
        )
        Object.defineProperty(target, key, {
          enumerable: true,
          configurable: true,
          value,
        })
      })
      // state
    } else {
      planexLog(`(${id}) ${key} is state`)

      stateKeys.push(key)
      const value = defineState(id, key, property.value, vuexOptions)
      ;[options, def].forEach(target =>
        Object.defineProperty(target, key, {
          enumerable: true,
          configurable: true,
          value,
        })
      )
    }
  })

  return [def, { stateKeys, getterKeys, actionKeys }, vuexOptions?.module]
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
  const [def, keys, vuexModule] = defStore(
    instance,
    storeId,
    () => store,
    usingVuex() && options.id !== false ? getStore : undefined
  )

  stateKeys = keys.stateKeys
  getterKeys = keys.getterKeys
  actionKeys = keys.actionKeys

  planexLog(`(${storeId}) creating reactive store instance`)

  if (vuexModule && usingVuex() && options.id !== false && !vuexPropogated) {
    planexLog(`(${storeId}) registering vuex module`)
    const vuexStore = getStore()
    const path = storeId.split('/')
    if (vuexStore.hasModule(path)) {
      const state = get(vuexStore.state, path.join('.'))
      Object.assign(vuexModule.state, state)
      vuexStore.unregisterModule(path)
    }
    vuexStore.registerModule(path, vuexModule)
    vuexPropogated = true
  } else {
    planexLog(`(${storeId}) NOT registering vuex module`)
  }

  store = reactive(instance) as ReturnType<UseStore<T>>

  const useStore = (() => store) as UseStore<T>

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
