import { isReactive, reactive } from '@vue/composition-api'
import { deepWritableComputed } from '../src/computed'
import { getLocalVue, LocalVue, wait } from './helper'

describe('computed', () => {
  let localVue: LocalVue
  beforeEach(() => {
    localVue = getLocalVue()
  })
  describe('deepWritableComputed', () => {
    it('works with nested set', () => {
      let data = reactive({ a: { b: { c: 44 } } })

      const cdata = deepWritableComputed({
        get: () => data,
        set: value => {
          Object.assign(data, value)
        },
      })

      const c = 99

      cdata.value.a.b.c = c

      expect(data.a.b.c).toBe(c)
    })

    it('works with root set', () => {
      let data = reactive({ a: { b: { c: 44 } } })

      const cdata = deepWritableComputed({
        get: () => data,
        set: value => {
          Object.assign(data, value)
        },
      })

      const c = 99

      cdata.value = { a: { b: { c: 99 } } }

      expect(data.a.b.c).toBe(c)
    })
  })
})
