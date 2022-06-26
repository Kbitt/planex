import {
  computed,
  install,
  isReactive,
  ref,
  watch,
  watchEffect,
} from 'vue-demi'
import { classToSetup, createStore, storeToRefs } from '../src/create-store'

describe('createStore', () => {
  beforeEach(() => install())

  it('should foo', () => {
    class TestClass {
      value = 1

      get next() {
        return this.value + 1
      }

      set next(value) {
        this.value = value - 1
      }

      inc() {
        this.value++
      }
    }

    const reactiveTest = createStore(TestClass)

    expect(reactiveTest.value).toBe(1)

    expect(reactiveTest.next).toBe(2)

    reactiveTest.inc()

    expect(reactiveTest.value).toBe(2)

    expect(reactiveTest.next).toBe(3)

    expect(isReactive(reactiveTest)).toBe(true)

    reactiveTest.next = 10

    expect(reactiveTest.value).toBe(9)

    expect(reactiveTest.next).toBe(10)
  })

  it('it should fn', () => {
    let doubleCalled = 0
    class TestClass {
      value = 123

      get double() {
        doubleCalled++
        return this.value * 2
      }

      setValue(value: number) {
        this.value = value
      }
    }

    const inst = createStore(TestClass)

    expect(inst.double).toBe(246)

    inst.setValue(444)

    expect(inst.value).toBe(444)

    expect(inst.double).toBe(888)
    expect(inst.double).toBe(888)

    expect(doubleCalled).toBe(2)
  })

  it('should not react to method call', () => {
    class TestClass {
      value = 0
      foo() {
        // noop
      }
    }

    const inst = createStore(TestClass)

    let called = 0

    const c = computed(() => {
      inst.foo()
      return inst.value + ++called
    })

    expect(c.value).toBe(1)

    inst.foo()

    expect(c.value).toBe(1)

    inst.value = 2

    expect(c.value).toBe(4)

    inst.foo()

    expect(c.value).toBe(4)
  })

  it('should work with toRefs', () => {
    let mock = jest.fn()
    class TestClass {
      value = 0
      bar = 'bar'
      bing() {
        mock()
      }
    }

    const inst = createStore(TestClass)

    const refs = storeToRefs(inst)

    expect(refs.bar.value).toBe('bar')
    expect(refs.value.value).toBe(0)

    refs.bing()

    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('refs should propogate back to instance', () => {
    class TestClass {
      value = 0
      bar = 'bar'
    }

    const inst = createStore(TestClass)

    const refs = storeToRefs(inst)

    refs.value.value = 123

    expect(inst.value).toBe(123)

    refs.bar.value = 'biz'

    expect(inst.bar).toBe('biz')
  })

  it('nested object is reactive', () => {
    class TestClass {
      data = {
        foo: {
          bar: {
            biz: '123',
          },
        },
      }
    }

    const inst = createStore(TestClass)

    expect(isReactive(inst.data)).toBeTruthy()
    expect(isReactive(inst.data.foo)).toBeTruthy()
    expect(isReactive(inst.data.foo.bar)).toBeTruthy()
  })

  it('should work with setup', () => {
    const store = createStore(() => {
      const count = ref(0)

      const next = computed(() => count.value + 1)
      const getSetNext = computed({
        get: () => 1 + count.value,
        set: value => (count.value = value - 1),
      })
      const inc = () => count.value++

      return { count, inc, next, getSetNext }
    })

    expect(store.count).toBe(0)
    expect(store.next).toBe(1)
    expect(store.getSetNext).toBe(1)

    store.inc()

    expect(store.count).toBe(1)
    expect(store.next).toBe(2)
    expect(store.getSetNext).toBe(2)

    store.getSetNext = 10

    expect(store.count).toBe(9)
    expect(store.next).toBe(10)
  })

  it('should support watch', done => {
    class TestClass {
      data = {
        foo: {
          bar: {
            biz: 'value',
          },
        },
      }
    }

    const store = createStore(TestClass)

    watch(
      store.data,
      newValue => {
        expect(newValue).toEqual({
          foo: {
            bar: {
              biz: 'new value',
            },
          },
        })
        done()
      },
      { deep: true }
    )

    store.data.foo.bar.biz = 'new value'
  })

  it('should support watch deep', done => {
    class TestClass {
      data = {
        foo: {
          bar: {
            biz: 'value',
          },
        },
      }
    }

    const store = createStore(TestClass)

    watch(
      store.data,
      newValue => {
        expect(newValue).toEqual({
          foo: {
            bar: {
              biz: 'new value',
            },
          },
        })
        done()
      },
      { deep: true }
    )

    store.data.foo = {
      bar: {
        biz: 'new value',
      },
    }
  })

  it('should work with watchEffect', done => {
    const mock = jest.fn()

    const store = createStore(
      class {
        value = 123
      }
    )

    watchEffect(() => {
      const _ = store.value
      mock()
    })

    store.value = 444

    setTimeout(() => {
      expect(mock).toBeCalledTimes(2)
      done()
    })
  })

  it('watchEffect should not be triggered by method', done => {
    const mock = jest.fn()

    const store = createStore(() => {
      const value = ref(123)
      const foo = () => (value.value = 444)
      return { value, foo }
    })

    watchEffect(() => {
      store.foo()
      mock()
    })

    store.foo()
    expect(store.value).toBe(444)
    store.value = 777

    setTimeout(() => {
      expect(mock).toHaveBeenCalledTimes(1)
      expect(store.value).toBe(777)

      setTimeout(() => {
        expect(mock).toHaveBeenCalledTimes(1)
        expect(store.value).toBe(777)
        done()
      })
    })
  })

  it('can chain promise from method', done => {
    const mock = jest.fn()
    class TestClass {
      foo() {
        return Promise.resolve().then(() => {
          mock()
        })
      }
    }

    const store = createStore(TestClass)

    store.foo().then(() => {
      expect(mock).toHaveBeenCalled()
      done()
    })
  })

  it('promise chain works with store', done => {
    class TestClass {
      data = 123
      get double() {
        return this.data * 2
      }
      foo() {
        return Promise.resolve().then(() => {
          this.data = 444
        })
      }
    }

    const store = createStore(TestClass)

    store.foo().then(() => {
      expect(store.data).toBe(444)
      expect(store.double).toBe(888)
      done()
    })
  })
})

describe('classToSetup', () => {
  it('1', () => {
    class Test {
      foo = 123
      get next() {
        return 1 + this.foo
      }

      get double() {
        return 2 * this.foo
      }

      set double(value) {
        this.foo = value / 2
      }
    }

    const setup = classToSetup(Test)

    const setupObj = setup()

    const { foo, next, double } = setupObj

    expect(foo.value).toBe(123)
    expect(next.value).toBe(124)
    expect(double.value).toBe(246)

    foo.value = 500

    expect(foo.value).toBe(500)
    expect(next.value).toBe(501)
    expect(double.value).toBe(1000)
  })
})
