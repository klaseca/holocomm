import type Type from 'typebox'
import { Decode } from 'typebox/value'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { Int } from './int.ts'

describe('int', () => {
  test('decodes an integer string to a number', () => {
    const schema = Int()

    expect(Decode(schema, '42')).toBe(42)
    expectTypeOf<Type.Static<typeof schema>>().toEqualTypeOf<string>()
    expectTypeOf<Type.StaticDecode<typeof schema>>().toEqualTypeOf<number>()
  })

  test('applies a numeric default', () => {
    expect(Decode(Int({ defaultValue: 42 }), undefined)).toBe(42)
  })

  test.each(['', '1.5', '1e3', '+1', ' 1', '1 ', 'not-a-number'])('rejects %j', (value) => {
    expect(() => Decode(Int(), value)).toThrow()
  })

  test('rejects unsafe and out-of-range integers', () => {
    const schema = Int({ minimum: 1, maximum: 10 })

    expect(() => Decode(schema, '0')).toThrow()
    expect(() => Decode(schema, '11')).toThrow()
    expect(() => Decode(Int(), '9007199254740992')).toThrow()
  })
})
