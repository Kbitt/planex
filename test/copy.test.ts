import { clone } from '../src/copy'

describe('copy', () => {
  describe('copyValue', () => {
    it('works', () => {
      const original = {
        foo: {
          bar: {
            biz: 123,
          },
        },
      }

      const copyOfOriginal = clone(original)

      expect(original).toEqual(copyOfOriginal)
      expect(original).not.toBe(copyOfOriginal)
    })

    it('works with function', () => {
      let add: jest.Mock<
        number,
        [number, number]
      > = jest.fn().mockImplementation((a: number, b: number) => {
        return a + b
      })

      const addCopy = clone(add)

      expect(addCopy(10, 12)).toBe(22)

      expect(add).not.toHaveBeenCalledWith()

      expect(add).not.toBe(addCopy)
    })

    it('works with nullish values', () => {
      const original = {
        foo: {
          bar: {
            biz: 123,
            bobo: null,
          },
          baz: undefined,
        },
        book: 0,
      }

      const copyOfOriginal = clone(original)

      expect(original).toEqual(copyOfOriginal)
      expect(original).not.toBe(copyOfOriginal)
    })
  })
})
