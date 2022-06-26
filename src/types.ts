import { ComputedRef, Ref, WritableComputedRef } from 'vue'

type Equals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B

/**
 * Get all keys for the given type that are writable.
 */
export type WritableKeys<Type> = {
  [Key in keyof Type]-?: Equals<
    { [K in Key]: Type[Key] },
    { -readonly [K in Key]: Type[Key] },
    Key
  >
}[keyof Type]

/**
 * Get all keys for the given type that are readonly.
 */
type ReadonlyKeys<Type> = {
  [Key in keyof Type]-?: Equals<
    { [K in Key]: Type[Key] },
    { -readonly [Q in Key]: Type[Key] },
    never,
    Key
  >
}[keyof Type]

type FunctionKeys<T> = {
  [P in keyof T]-?: T[P] extends (...args: any) => any ? P : never
}[keyof T]

type NonFunctionKeys<T> = {
  [P in keyof T]-?: T[P] extends (...args: any) => any ? never : P
}[keyof T]

type StateKeys<T> = {
  [Key in keyof T]: Key extends WritableKeys<T>
    ? Key extends NonFunctionKeys<T>
      ? Key
      : never
    : never
}[keyof T]

type GetterKeys<T> = keyof Omit<T, WritableKeys<T>>

export type MappedComputedState<Type> = {
  [Key in StateKeys<Type>]: {
    get: () => Type[Key]
    set: (value: Type[Key]) => void
  }
}

export type MappedComputedGetters<Type> = {
  [Key in GetterKeys<Type>]: () => Type[Key]
}

export type MappedMethods<Type> = {
  [Key in FunctionKeys<Type>]: Type[Key]
}

/**
 * Extra store configuration options
 */
export type DefineOptions = {
  /**
   * Sets the store's ID. A generic unique ID will be generated if not specified.
   */

  id?: string | false
}

export type Mapper<T> = {
  [P in keyof T]?: string
}

export type MappedRefs<T> = {
  [P in keyof T]: T[P] extends (...args: infer A) => any
    ? T[P]
    : P extends ReadonlyKeys<T>
    ? ComputedRef<T[P]>
    : Ref<T[P]>
}

export type ResultType<T> = T extends { new (): infer R }
  ? R
  : T extends () => infer R
  ? R
  : T extends {}
  ? T
  : never

export type UseStore<T> = {
  (): ResultType<T>
  $refs: MappedRefs<ResultType<T>>
}

export type SetterPayload = {
  key?: string
  value: any
}

export type ActionKeys<T> = {
  [Key in keyof T]: T[Key] extends Function ? Key : never
}[keyof T]

export type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X
  ? 1
  : 2) extends <T>() => T extends Y ? 1 : 2
  ? A
  : B

type ComputedRefKeys<T> = {
  [Key in keyof T]: T[Key] extends ComputedRef<any>
    ? 'value' extends ReadonlyKeys<T[Key]>
      ? Key
      : never
    : never
}[keyof T]

type WritableRefsAndMethodKeys<T> = {
  [Key in keyof T]: Key extends ComputedRefKeys<T> ? never : Key
}[keyof T]

type Bar = {
  a: Ref<string>
  b: ComputedRef<string>
  c: WritableComputedRef<string>
  foo(): void
}

export type UnwrapSetupRefs<T> = {
  [Key in WritableRefsAndMethodKeys<T>]: T[Key] extends Ref<infer V>
    ? V
    : T[Key]
} &
  {
    readonly [Key in ComputedRefKeys<T>]: T[Key] extends Ref<infer V>
      ? V
      : T[Key]
  }
