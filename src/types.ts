import { ComputedRef, Ref } from '@vue/composition-api'
import { Module, Store } from 'vuex'

type Equals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B

/**
 * Get all keys for the given type that are writable.
 */
type WritableKeys<Type> = {
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

type ExtractState<T> = Pick<T, StateKeys<T>>

type GetterKeys<T> = keyof Omit<T, WritableKeys<T>>

type ExtractGetters<T> = Pick<T, ReadonlyKeys<T>>

type ExtractActions<T> = Pick<T, FunctionKeys<T>>

type StateSubscriber<T> = (state: ExtractState<T>) => void
type GetterSubscriber<T> = (getters: ExtractGetters<T>) => void

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
   * Sets the store's ID, which will be used for a generated Vuex module (if enabled)
   * If set to `false`, then Vuex integration with be disabled for this store (if it is enabled via plugin config.)
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
  $mapComputed(): MappedComputedState<ResultType<T>> &
    MappedComputedGetters<ResultType<T>>
  $mapMethods(): MappedMethods<ResultType<T>>
  $refs: MappedRefs<ResultType<T>>
} & (T extends { new (): {} } ? { $class: T } : {})

export type VuexOptions = {
  module: Module<any, any>
  getStore: () => Store<any>
}

export type SetterPayload = {
  key?: string
  value: any
}
