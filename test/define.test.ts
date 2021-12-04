import { defineComponent, isReactive, watchEffect } from '@vue/composition-api'
import { shallowMount } from '@vue/test-utils'
import { Store } from 'vuex'
import Planex, { defineStore } from '../src'
import { getLocalVue } from './helper'

const asyncTimeout = () => new Promise(resolve => setTimeout(resolve))

describe('create-store', () => {
  let localVue: ReturnType<typeof getLocalVue>
  let vuexStore: Store<any>

  const setup = (enableVuex: boolean) => {
    localVue = getLocalVue()
    if (!enableVuex) return
    vuexStore = new Store({ strict: true })
    localVue.use(Planex, { useVuex: { store: vuexStore } })
  }

  describe('test', () => {
    beforeEach(() => {
      setup(false)
    })
  })

  describe('defineStore', () => {
    ;[true, false].forEach(enableVuex => {
      describe(`with${enableVuex ? '' : 'out'} vuex`, () => {
        beforeEach(() => {
          setup(enableVuex)
        })

        it('works', async () => {
          const nextMock = jest.fn()
          const useStore = defineStore(
            class {
              value = 123

              private foo = 'abc'

              get next() {
                nextMock()
                return this.value + 1
              }

              get upperFoo() {
                return this.foo.toUpperCase()
              }

              setValue(value: number) {
                this.value = value
              }
            }
          )

          const store = useStore()

          expect(store.value).toBe(123)
          expect(store.next).toBe(124)
          expect(store.next).toBe(124)
          expect(store.next).toBe(124)

          expect(store.upperFoo).toBe('ABC')

          expect(nextMock).toHaveBeenCalledTimes(1)

          store.setValue(444)
          expect(store.next).toBe(445)

          expect(nextMock).toHaveBeenCalledTimes(2)
        })

        it('nested json is reactive', () => {
          const useFoo = defineStore({
            bar: { baz: 123 },
          })

          const store = useFoo()

          expect(isReactive(store)).toBe(true)

          expect(isReactive(store.bar)).toBe(true)
        })

        it('nested object is reactive', () => {
          class Foo {
            bar = {
              baz: 123,
            }
          }

          const useFoo = defineStore(Foo)

          const store = useFoo()

          expect(isReactive(store)).toBe(true)

          expect(isReactive(store.bar)).toBe(true)
        })

        it('resetting nested object is reactive', () => {
          class Foo {
            bar = {
              baz: 123,
            }
          }

          const useFoo = defineStore(Foo)

          const store = useFoo()

          store.bar = { baz: 7777 }

          expect(isReactive(store)).toBe(true)

          expect(isReactive(store.bar)).toBe(true)
        })

        it('nested object from base class is reactive', () => {
          class Foo {
            bar = {
              baz: 123,
            }
          }

          const useFoo = defineStore(class extends Foo {})

          const store = useFoo()

          expect(isReactive(store)).toBe(true)

          expect(isReactive(store.bar)).toBe(true)
        })

        it('inheritance', () => {
          const mock = jest.fn()
          class BaseFoo {
            private val = 123
            foo() {
              mock()
            }
          }

          class Foo extends BaseFoo {
            foo() {
              super.foo()
            }
          }

          class SuperFoo extends Foo {
            foo() {
              super.foo()
            }
          }

          const useStore = defineStore(SuperFoo)

          const store = useStore()

          store.foo()

          expect(mock).toHaveBeenCalled()

          expect('val' in store).toBe(true)
        })

        it('extend $class', () => {
          const mockFoo = jest.fn()
          const useBase = defineStore(
            class {
              foo() {
                mockFoo()
              }
            }
          )

          const mockBar = jest.fn()
          const useStore = defineStore(
            class extends useBase.$class {
              bar() {
                mockBar()
              }
            }
          )

          const store = useStore()

          store.bar()

          expect(mockBar).toHaveBeenCalled()

          store.foo()

          expect(mockFoo).toHaveBeenCalled()
        })

        enableVuex &&
          it('propogate to store', async () => {
            const next = () => new Promise(resolve => setTimeout(resolve))
            const useStore = defineStore(
              class {
                value = 123
                get next() {
                  return this.value + 1
                }
                set next(value) {
                  this.value = value - 1
                }
              },
              { id: 'store' }
            )

            const store = useStore()

            await next()

            expect(vuexStore.state.store.value).toBe(123)
            expect(vuexStore.getters['store/next']).toBe(124)

            store.next = 400

            await next()
            expect(vuexStore.state.store.value).toBe(399)
            expect(vuexStore.getters['store/next']).toBe(400)

            store.next = 1001

            await next()
            expect(vuexStore.state.store.value).toBe(1000)
            expect(vuexStore.getters['store/next']).toBe(1001)
          })

        it('returns same instance', () => {
          const useStore = defineStore(
            class {
              foo = 123
            }
          )

          const storeA = useStore()

          const storeB = useStore()

          expect(storeB === storeA).toBe(true)
        })

        it('object syntax', () => {
          const useStore = defineStore({
            value: 123,
            setValue(value: number) {
              this.value = value
            },
          })

          const store = useStore()

          expect(store.value).toBe(123)

          const value = 444

          store.setValue(value)

          expect(store.value).toBe(value)
        })

        it('function syntax', () => {
          const useStore = defineStore(() => ({
            value: 123,
            setValue(value: number) {
              this.value = value
            },
          }))

          const store = useStore()

          expect(store.value).toBe(123)

          const value = 444

          store.setValue(value)

          expect(store.value).toBe(value)
        })

        it('can map to options API', async () => {
          const useCounter = defineStore(
            class {
              count = 0

              increment() {
                this.count++
              }

              get next() {
                return this.count + 1
              }
              set next(value) {
                this.count = value - 1
              }
            }
          )

          const Component = defineComponent({
            template: `
              <div>
                <button @click="increment">{{ count }}</button>
                <p>{{ next }}</p>
              </div>
            `,
            computed: {
              ...useCounter.$mapComputed(),
            },
            methods: {
              ...useCounter.$mapMethods(),
            },
          })

          const wrapper = shallowMount(Component, { localVue })
          const btn = wrapper.find('button').element
          const p = wrapper.find('p').element
          expect(btn.innerHTML).toBe('0')
          expect(p.innerHTML).toBe('1')
          btn.click()
          await localVue.nextTick()

          await asyncTimeout()

          expect(btn.innerHTML).toBe('1')
          expect(p.innerHTML).toBe('2')
        })

        it('call other store', () => {
          const useBase = defineStore({
            value: 123,
          })

          const useStore = defineStore({
            get baseValue() {
              return useBase().value
            },
          })

          const store = useStore()

          expect(store.baseValue).toBe(123)

          const baseStore = useBase()

          baseStore.value = 444

          expect(store.baseValue).toBe(444)
        })

        it('set deep state value', cb => {
          const useStore = defineStore(
            class {
              state = {
                foo: {
                  bar: {
                    value: 123,
                  },
                },
              }
            }
          )

          const store = useStore()

          let firstCall = true

          const mock = jest.fn()

          watchEffect(() => {
            const _ = store.state.foo.bar.value
            if (firstCall) {
              firstCall = false
              return
            }
            mock()
          })

          store.state.foo.bar.value = 444

          setTimeout(() => {
            expect(mock).toHaveBeenCalled()
            cb()
          })
        })

        it('store is instanceof class, arrow function keeps lexical this', () => {
          const defaultMock = jest.fn()
          abstract class AbsStore {
            foo() {
              if (this.bar) {
                this.bar()
              } else {
                defaultMock()
              }
            }

            bar?: () => void
          }

          let instance: any = undefined

          class Store extends AbsStore {
            bar = () => {
              instance = this
            }
          }

          const useStore = defineStore(Store)

          const store = useStore()

          store.bar()

          expect(defaultMock).not.toHaveBeenCalled()

          expect(store instanceof Store).toBe(true)
          expect(instance instanceof Store).toBe(true)

          expect(store).toBe(instance)
        })

        it('getter reacts to private state change', () => {
          const useStore = defineStore(
            class {
              private _value = false
              get value() {
                return this._value
              }

              setValue(value: boolean) {
                this._value = value
              }
            }
          )

          const store = useStore()

          expect(store.value).toBe(false)

          store.setValue(true)

          expect(store.value).toBe(true)
        })

        it('$refs works', () => {
          const useStore = defineStore(
            class {
              private _value = false

              get value() {
                return this._value
              }

              setValue(value: boolean) {
                this._value = value
              }

              private _count = 0

              get count() {
                return this._count
              }
              set count(value) {
                this._count = value
              }
            }
          )

          const store = useStore()

          const { value, count, setValue } = useStore.$refs

          expect(store.value).toBe(false)
          expect(value.value).toBe(false)

          expect(store.count).toBe(0)
          expect(count.value).toBe(0)

          setValue(true)

          expect(store.value).toBe(true)
          expect(value.value).toBe(true)

          store.setValue(false)

          expect(store.value).toBe(false)
          expect(value.value).toBe(false)
        })

        it('action does not trigger reactivity on other properties', cb => {
          const useStore = defineStore(
            class {
              value = ''

              setValue(value: string) {
                this.value = value
              }
            }
          )

          const store = useStore()

          let callCount = 0
          watchEffect(() => {
            callCount++
            if (callCount > 1) return
            store.setValue('abc')
          })

          setTimeout(() => {
            setTimeout(() => {
              expect(callCount).toBe(1)
              cb()
            })
          })
        })

        it('can override getter', () => {
          const baseMock = jest.fn()
          const useBaseStore = defineStore(
            class {
              value = 'abc'

              get upperValue() {
                baseMock()
                return this.value.toUpperCase()
              }
            }
          )

          const overrideMock = jest.fn()
          const useStore = defineStore(
            class extends useBaseStore.$class {
              get upperValue() {
                overrideMock()
                return this.value.toUpperCase()
              }
            }
          )

          const store = useStore()

          const value = store.upperValue

          expect(value).toBe('ABC')

          expect(baseMock).not.toHaveBeenCalled()

          expect(overrideMock).toHaveBeenCalled()
        })

        it('can mutate nested state', () => {
          const useStore = defineStore(
            class {
              data = {
                value: '123',
              }
            }
          )

          const store = useStore()

          const value = 'abc'

          store.data.value = value

          expect(store.data).toEqual({ value })
        })

        it('can mutate nested setter', () => {
          const useStore = defineStore(
            class {
              private innerData = {
                value: '123',
              }

              get data() {
                console.log('get data?')
                return this.innerData
              }
              set data(value) {
                this.innerData = value
              }
            }
          )

          const store = useStore()

          const value = 'abc'

          store.data.value = value

          expect(store.data).toEqual({ value })
        })

        it('null property works', () => {
          class Foo {
            value: string | null = null
          }
          const useStore = defineStore(Foo)

          const store = useStore()

          const getValue = () => store.value

          expect(getValue).not.toThrow()

          expect(store.value).toBe(null)

          store.value = 'test'

          expect(getValue).not.toThrow()

          expect(store.value).toBe('test')
        })

        it('objects with null property works', () => {
          const useStore = defineStore(
            class {
              foo = {
                value: null as string | null,
              }
            }
          )

          const store = useStore()

          const getValue = () => store.foo.value

          expect(getValue).not.toThrow()
        })

        it('objects with null array values work', () => {
          const useStore = defineStore(
            class {
              values: (string | null)[] = ['abc', null]
            }
          )

          const store = useStore()

          const getValue = () => store.values[1]

          expect(getValue).not.toThrow()
        })

        it('nullish properties included in $refs', () => {
          const useStore = defineStore(
            class {
              foo = null
              bar = undefined
            }
          )

          expect(useStore.$refs.foo).toBeTruthy()
          expect(useStore.$refs.bar).toBeTruthy()
        })

        it('nested date preserved', () => {
          const useStore = defineStore(
            class {
              value: undefined | { value: Date } = undefined
            }
          )

          const store = useStore()

          const value = new Date()

          store.value = { value }

          const actual = store.value?.value

          expect(actual instanceof Date).toBe(true)
          expect(actual.valueOf()).toBe(value.valueOf())
        })
      })
    })
  })
})
