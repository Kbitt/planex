import {
  computed,
  ComputedRef,
  Ref,
  watch,
  WritableComputedOptions,
  WritableComputedRef,
} from '@vue/composition-api'
import { VuexOptions } from './types'

export const deepWritableComputed = <T>({
  get,
  set,
}: WritableComputedOptions<T>): WritableComputedRef<T> => {
  const cpu = computed({ get, set })

  // TODO pass stop handler to context
  watch(
    () => cpu.value,
    value => {
      set(value)
    },
    { deep: true }
  )

  return cpu
}

export const defineComputed = (
  id: string,
  key: string,
  getter: () => any,
  setter?: (value?: any) => void,
  options?: VuexOptions
): Ref<any> | ComputedRef<any> => {
  if (options) {
    if (!options.module.getters) {
      options.module.getters = {}
    }

    options.module.getters[key] = getter
  }

  if (setter) {
    return deepWritableComputed({ get: getter, set: setter })
  }
  return computed(getter)
}
