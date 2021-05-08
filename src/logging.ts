let enabled = false

export const setLoggingStatus = (isEnabled: boolean) => (enabled = isEnabled)

export const planexLog = (...args: any[]) => {
  if (!enabled) return
  console.log('Planex log:', ...args)
}
