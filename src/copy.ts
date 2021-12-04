export const copyValue = <T>(input: T): T => {
  if (!input) {
    return input
  }

  if (input instanceof Date) {
    return new Date(input) as any
  }

  if (typeof input === 'object') {
    const copyObject = {} as any

    Object.keys(input).forEach(key => {
      copyObject[key] = copyValue((input as any)[key])
    })

    return copyObject
  } else if (typeof input === 'function') {
    const copyFunction = input.bind({})
    Object.keys(input).forEach(key => {
      copyFunction[key] = copyValue((input as any)[key])
    })
    return copyFunction
  }

  // simple value, just return
  return input
}
