import { createPatchState, get, set } from '../src/getset'

describe('get', () => {
  const data: [any, string, any][] = [
    [{ foo: 'xyz' }, 'foo', 'xyz'],
    [{ a: { b: { value: 123 } } }, 'a.b.value', 123],
    [
      { foo: { bar: { baz: { value: 48484 }, baz2: {} } } },
      'foo.bar.baz.value',
      48484,
    ],
  ]

  data.forEach(([obj, path, expected], index) => {
    it('case-' + index, () => {
      const result = get(obj, path)
      expect(result).toBe(expected)
    })
  })

  const throwData: [any, string][] = [
    [{ a: { b: { c: 'c' } } }, 'c.f'],
    [{ a: { b: { c: 'c' } } }, 'g.b.d.e'],
  ]

  throwData.forEach((args, index) => {
    it('should throw - ' + index, () => {
      const testFn = get.bind(null, ...args)
      expect(testFn).toThrow()
    })
  })
})

describe('set', () => {
  const data: [any, string, any, (o: any) => any][] = [
    [{ foo: 'xyz' }, 'foo', 'xyz', o => o.foo],
    [{ a: { b: { value: 123 } } }, 'a.b.value', 123, o => o.a.b.value],
    [
      { foo: { bar: { baz: { value: 48484 }, baz2: {} } } },
      'foo.bar.baz.value',
      48484,
      o => o.foo.bar.baz.value,
    ],
  ]

  data.forEach(([obj, path, value, getExpected], index) => {
    it('case-' + index, () => {
      set(obj, path, value)
      expect(value).toBe(getExpected(obj))
    })
  })

  const throwData: [any, string][] = [
    [{ a: { b: { c: 'c' } } }, 'a.g.d'],
    [{ a: { b: { c: 'c' } } }, 'g.b.d.e'],
  ]

  throwData.forEach((args, index) => {
    it('should throw - ' + index, () => {
      const testFn = set.bind(null, ...[...args, null])
      expect(testFn).toThrow()
    })
  })
})

describe('createPatchState', () => {
  it('works', () => {
    const state = {
      a: {},
      b: { b0: { b1: { value: 123 } } },
      c: {},
    }

    const patch = createPatchState(state, 'b.b0.b1.value', 444)

    expect(patch).toEqual({
      b: { b0: { b1: { value: 444 } } },
    })
  })

  it('works with branched object', () => {
    const state = {
      a: { a0: { a1: { vv: 4444 } } },
      b: { b0: { b1: { value: 123 } } },
      c: { c0: { c1: { cccc: 4389493 } } },
    }

    const patch = createPatchState(state, 'b.b0.b1.value', 444)

    expect(patch).toEqual({
      b: { b0: { b1: { value: 444 } } },
    })
  })
})
