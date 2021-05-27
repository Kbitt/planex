import { VuexOptions } from './types'

export const defineAction = (
  id: string,
  key: string,
  action: (...args: any) => any,
  options?: VuexOptions
) => {
  if (!options) {
    return action
  }

  if (!options.module.actions) {
    options.module.actions = {}
  }

  options.module.actions[key] = (_, payload) => {
    return action(...payload)
  }

  return (...args: any) => options.getStore().dispatch(`${id}/${key}`, args)
}
