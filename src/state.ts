import { Ref, ref, watch } from '@vue/composition-api'
import { copyValue } from './copy'
import { set } from './getset'
import { SetterPayload, VuexOptions } from './types'

export const defineState = (
  id: string,
  key: string,
  value: any,
  options?: VuexOptions
): Ref<any> => {
  const valueRef = ref(copyValue(value))
  if (!options) {
    return valueRef
  }
  if (!options.module.state) {
    options.module.state = {}
  }
  if (!options.module.mutations) {
    options.module.mutations = {}
  }
  options.module.state[key] = copyValue(value)
  options.module.mutations[`SET_${key}`] = (state, payload: SetterPayload) => {
    const path = [key, payload.key].filter(Boolean).join('.')
    set(state, path, payload.value)
  }

  watch(
    () => valueRef.value,
    state => {
      options.getStore().commit(`${id}/SET_${key}`, { value: state })
    },
    { deep: true }
  )

  return valueRef
}
