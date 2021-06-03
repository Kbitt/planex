import { VuexOptions } from './types'

export const defineAction = (
  id: string,
  key: string,
  action: (...args: any) => any,
  options?: VuexOptions
) => {
  return action
}
