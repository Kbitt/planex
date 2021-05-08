import { computed, reactive, ref } from '@vue/composition-api'
import { defineStore } from 'planex'

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

function getCompletePropertyMap<T extends {}>(
  obj: T
): {
  [P in keyof T]: PropertyDescriptor
} {
  const props = getAllPropertyNames(obj)
  const map = {} as any
  props.forEach(key => {
    map[key] = getNearestPropertyDescriptor(obj, key)
  })

  return map
}

class LoadingStore {
  private _loading = false

  get loading() {
    return this._loading
  }

  setLoading(value: boolean) {
    this._loading = value
  }
}

const loadingStore = new LoadingStore()

const propertyMap = getCompletePropertyMap(loadingStore)

Object.defineProperty(loadingStore, '_loading', {
  enumerable: true,
  configurable: true,
  value: ref(false),
})

Object.defineProperty(loadingStore, 'loading', {
  enumerable: true,
  configurable: true,
  value: computed(() => propertyMap['loading'].get!.call(loadingStore)),
})

Object.defineProperty(loadingStore, 'setLoading', {
  enumerable: true,
  configurable: true,
  value: (propertyMap['setLoading'].value as Function).bind(loadingStore),
})

const re = reactive(loadingStore)

export const useLoadingStore = () => re as LoadingStore
