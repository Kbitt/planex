import { computed, Ref, ref } from '@vue/composition-api'
import { get, set } from './getset'
import { createProxy } from './proxy'
import { SetterPayload, VuexOptions } from './types'

export const defineState = (
  id: string,
  key: string,
  value: any,
  options?: VuexOptions
): Ref<any> => {
  if (!options) {
    return ref(value)
  }
  if (!options.module.state) {
    options.module.state = {}
  }
  if (!options.module.mutations) {
    options.module.mutations = {}
  }
  options.module.state[key] = value
  options.module.mutations[`SET_${key}`] = (state, payload: SetterPayload) => {
    set(state, [key, payload.key].filter(Boolean).join('.'), payload.value)
  }

  return computed({
    get: () => {
      const value = get(
        options.getStore().state,
        [...id.split('/'), key].join('.')
      )

      if (typeof value !== 'object') {
        return value
      }

      return createProxy([value], {
        setter: (innerKey, val) => {
          options.getStore().commit(`${id}/SET_${key}`, {
            key: innerKey,
            value: val,
          })
        },
      })
    },
    set: value => options.getStore().commit(`${id}/SET_${key}`, { value }),
  })
}
