import { createProxy, isClassInstance, cloneClassInstance } from '../src/proxy'

describe('proxy', () => {
  describe('createProxy', () => {
    describe('get', () => {
      it('works with single object', () => {
        const a = { a: 123 }

        const aProxy = createProxy(a)

        expect(a.a).toEqual(aProxy.a)
      })

      it('works with method', () => {
        const a = {
          x: 2,
          y: 4,
          area() {
            return this.x * this.y
          },
        }

        const proxy = createProxy(a)

        expect(8).toEqual(proxy.area())
      })

      it('works with array', () => {
        const a = { values: [1, 2, 3, 4, 5] }

        const proxy = createProxy(a)

        expect(proxy.values).toEqual(a.values)
      })

      it('method uses proxy', () => {
        const a = {
          getThis() {
            return this
          },
        }

        const proxy = createProxy(a)

        expect(a).toBe(a.getThis())

        expect(proxy).toBe(proxy.getThis())

        expect(proxy).not.toBe(a.getThis())
        expect(a).not.toBe(proxy.getThis())
      })

      it('works with nested object', () => {
        const a = { b: { value: 123 } }

        const proxy = createProxy(a)

        // proxied object should not have same reference
        expect(a.b).not.toBe(proxy.b)

        expect(a.b.value).toEqual(proxy.b.value)
      })

      it('works with nested nested object', () => {
        const a = { b: { c: { value: 123 } } }

        const proxy = createProxy(a)

        // proxied object should not have same reference
        expect(a.b).not.toBe(proxy.b)
        expect(a.b.c).not.toBe(proxy.b.c)

        expect(a.b.c.value).toEqual(proxy.b.c.value)
      })
    })

    describe('set', () => {
      it('works with single object', () => {
        const a = { a: 123 }

        const aProxy = createProxy(a)

        const value = 989

        aProxy.a = value

        expect(value).toEqual(aProxy.a)
      })

      it('works with nested object', () => {
        const a = { b: { value: 123 } }

        const proxy = createProxy(a)

        const value = 4444

        proxy.b = { value }

        expect(value).toBe(a.b.value)
      })

      it('works with deeply nested object', () => {
        const a = { b: { c: { d: { value: 4483 }, value: 3333 } } }

        const proxy = createProxy(a)

        const dValue = 22222
        const dInnerValue = 4848484

        proxy.b.c = { value: dValue, d: { value: dInnerValue } }

        expect(dValue).toBe(a.b.c.value)
        expect(dInnerValue).toBe(a.b.c.d.value)
      })

      it('works with nested object properties', () => {
        const a = { b: { value: 123 } }

        const proxy = createProxy(a)

        const value = 9998

        proxy.b.value = value

        expect(value).toEqual(a.b.value)
      })

      it('works with nested nested object properties', () => {
        const a = { b: { c: { value: 123 } } }

        const proxy = createProxy(a)

        const value = 434343

        proxy.b.c.value = value

        expect(value).toEqual(a.b.c.value)
      })

      it('works with class instance', () => {
        class Foo {
          value = 123
        }

        const foo = new Foo()

        const fooProxy = createProxy(foo)

        expect(fooProxy instanceof Foo).toBe(true)

        const value = 444

        fooProxy.value = value

        expect(foo.value).toBe(value)
      })

      it('works with nested date', () => {
        class Foo {
          value: undefined | { date: Date } = undefined
        }

        const foo = new Foo()

        const fooProxy = createProxy(foo)

        const value = { date: new Date() }

        fooProxy.value = value

        expect(foo.value).toEqual(value)
      })
    })
  })

  describe('isClassInstance', () => {
    class Foo {}
    const data: [any, boolean][] = [
      [{}, false],
      [{ foo: 123 }, false],
      [new Foo(), true],
      [new (class {})(), true],
      [new Date(), true],
    ]

    data.forEach(([o, expected], index) => {
      it(`#${index} should be ${expected}`, () => {
        const actual = isClassInstance(o)

        expect(actual).toBe(expected)
      })
    })
  })

  describe('cloneClassInstance', () => {
    it('works', () => {
      class Foo {
        value = 123

        get double() {
          return this.value * 2
        }
      }

      const foo = new Foo()

      const clone = cloneClassInstance(foo)

      expect(clone instanceof Foo).toBe(true)
    })

    it('works with constructor class', () => {
      class Foo {
        constructor(public value: number) {}

        get double() {
          return this.value * 2
        }
      }

      const value = 444

      const foo = new Foo(value)

      const clone = cloneClassInstance(foo)

      expect(clone instanceof Foo).toBe(true)
      expect(clone.value).toBe(value)
      expect(clone.double).toBe(2 * value)
    })

    it('works with complex dependencies', () => {
      class ValueProvider {
        constructor(private _value: number) {}
        get value() {
          return this._value
        }
        set value(value) {
          this._value = value
        }
      }
      class Foo {
        constructor(public provider: ValueProvider) {}

        get value() {
          return this.provider.value
        }

        get double() {
          return this.provider.value * 2
        }
      }

      const value = 444

      const foo = new Foo(new ValueProvider(value))

      const clone = cloneClassInstance(foo)

      expect(clone instanceof Foo).toBe(true)
      expect(clone.value).toBe(value)
      expect(clone.double).toBe(2 * value)
      expect(foo.provider).toBe(clone.provider)
    })
  })
})
