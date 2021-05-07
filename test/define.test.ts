import {
  computed,
  defineComponent,
  reactive,
  watchEffect,
} from '@vue/composition-api'
import { shallowMount } from '@vue/test-utils'
import { Store } from 'vuex'
import Planex, { defineStore } from '../src'
import { getLocalVue } from './helper'

describe('create-store', () => {
  let localVue: ReturnType<typeof getLocalVue>
  let vuexStore: Store<any>

  beforeEach(() => {
    localVue = getLocalVue()
    vuexStore = new Store({ strict: true })
    localVue.use(Planex, { useVuex: { store: vuexStore } })
  })

  describe('defineStore', () => {
    it('works', () => {
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

      expect(vuexStore.state.store.state.value).toBe(123)
      expect(vuexStore.state.store.getters.next).toBe(124)

      store.next = 400

      await next()
      expect(vuexStore.state.store.state.value).toBe(399)
      expect(vuexStore.state.store.getters.next).toBe(400)

      store.next = 1001

      await next()
      expect(vuexStore.state.store.state.value).toBe(1000)
      expect(vuexStore.state.store.getters.next).toBe(1001)
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
  })
})
