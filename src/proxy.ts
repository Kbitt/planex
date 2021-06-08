import { getAllPropertyNames } from './util'

export type MergedArgs<T extends any[]> = T extends [infer U, ...infer V]
  ? Omit<U, keyof MergedArgs<V>> & MergedArgs<V>
  : {}

export type ProxyOf<T extends any[]> = MergedArgs<T>

export const proxyToJson = <T extends {}>(proxy: T): T => {
  const result: any = {}

  Object.keys(proxy).forEach(key => {
    const value = (proxy as any)[key]
    if (typeof value === 'object') {
      result[key] = proxyToJson(value)
      if (Array.isArray(value)) {
        result[key] = Array.from({ ...result[key], length: value.length })
      }
    } else {
      result[key] = value
    }
  })

  return result
}

export const isClassInstance = <T extends {}>(o: T) => {
  return (
    typeof o === 'object' &&
    Object.getPrototypeOf(o).constructor.name !== 'Object'
  )
}

const sideEffectArrayMethods = [
  'push',
  'fill',
  'pop',
  'reverse',
  'sort',
  'splice',
  'shift',
  'unshift',
] as const

const createProxyInternal = <T extends {}>(
  object: T,
  anscestors: string[] = [],
  { ignoreKeys, ...options }: ProxyOptions = {}
): T => {
  if (Array.isArray(object)) {
    const o = object as any[]
    const arrayProxy: any[] = []

    o.forEach((v, index) => {
      if (typeof v === 'object' && v) {
        arrayProxy.push(
          createProxyInternal(v, [...anscestors, index + ''], options)
        )
      } else {
        arrayProxy.push(v)
      }
    })

    sideEffectArrayMethods.forEach(methodName => {
      const original = arrayProxy[methodName] as Function
      Object.defineProperty(arrayProxy, methodName, {
        value: function (this: any, ...args: any) {
          const result = original.apply(this, args)
          if (options.setter) {
            options.setter(anscestors.join('.'), [...arrayProxy])
          }
          return result
        },
      })
    })

    return arrayProxy as any
  }

  let proxy: any = Object.create(object)
  const o = object as any
  const props = getAllPropertyNames(o)
  props.forEach((key, index) => {
    if (!!ignoreKeys?.[index]?.includes(key)) {
      return
    }
    if (typeof o[key] === 'object' && o[key] && !isClassInstance(o[key])) {
      const createObjectProxy = () => {
        let p = createProxyInternal(o[key], [...anscestors, key], options)
        if (Array.isArray(o[key])) {
          p.length = o[key].length
          p = Array.from(p as any)
        }

        return p
      }

      let innerProxy = createObjectProxy()

      Object.defineProperty(proxy, key, {
        configurable: true,
        enumerable: true,
        get: () => {
          return innerProxy
        },
        set: value => {
          if (options.setter) {
            options.setter([...anscestors, key].join('.'), value)
          } else {
            o[key] = value
            innerProxy = createObjectProxy()
          }
        },
      })
    } else if (typeof o[key] === 'function') {
      const fn = o[key] as Function
      proxy[key] = fn.bind(proxy)
    } else {
      Object.defineProperty(proxy, key, {
        configurable: true,
        enumerable: true,
        get: () => o[key],
        set: value => {
          if (options.setter) {
            options.setter([...anscestors, key].join('.'), value)
          } else {
            o[key] = value
          }
        },
      })
    }
  })

  return proxy
}

export const createProxy = <T extends {}>(
  object: T,
  options: ProxyOptions = {}
) => createProxyInternal(object, [], options)

export type ProxyOptions = {
  setter?: (key: string, value: any) => void
  ignoreKeys?: string[][]
}
