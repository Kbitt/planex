import { computed, ComputedRef, Ref } from '@vue/composition-api'
import { get, set } from './getset'
import { createProxy } from './proxy'
import { SetterPayload, VuexOptions } from './types'

export const defineComputed = (
  id: string,
  key: string,
  getter: () => any,
  setter?: (value?: any) => void,
  options?: VuexOptions
): Ref<any> | ComputedRef<any> => {
  if (!options) {
    if (setter) {
      return computed({
        get: getter,
        set: setter,
      })
    }
    return computed(getter)
  }

  if (!options.module.getters) {
    options.module.getters = {}
  }

  options.module.getters[key] = getter

  const computedGet = () => get(options.getStore().getters, `${id}/${key}`)

  if (setter) {
    if (!options.module.actions) {
      options.module.actions = {}
    }

    options.module.actions[`set_${key}`] = (
      _,
      { key: innerKey, value }: SetterPayload
    ) => {
      if (!innerKey) {
        setter(value)
      } else {
        const original = { ...computedGet() }
        set(original, innerKey, value)
        setter(original)
      }
    }

    return computed({
      get: () => {
        const value = computedGet()

        if (typeof value !== 'object') {
          return value
        }

        return createProxy([value], {
          setter: (innerKey, value) => {
            options
              .getStore()
              .dispatch(`${id}/set_${key}`, { key: innerKey, value })
          },
        })
      },
      set: value => options.getStore().dispatch(`${id}/set_${key}`, { value }),
    })
  }

  return computed(computedGet)
}
