export function getAllPropertyNames(obj: any) {
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

export function getNearestPropertyDescriptor(obj: any, key: string) {
  while (obj) {
    const property = Object.getOwnPropertyDescriptor(obj, key)
    if (property) {
      return property
    }
    obj = Object.getPrototypeOf(obj)
  }
}

export const defaultObjectNames = new Set<string>(
  Object.getOwnPropertyNames(Object.getPrototypeOf({}))
)
