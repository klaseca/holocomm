import Type from 'typebox'

export interface TIntOptions {
  defaultValue?: number
  minimum?: number
  maximum?: number
}

export function Int(options: TIntOptions = {}) {
  const {
    defaultValue,
    minimum = Number.MIN_SAFE_INTEGER,
    maximum = Number.MAX_SAFE_INTEGER,
  } = options

  const encoded = Type.Refine(
    Type.String({
      ...(defaultValue != null && { default: String(defaultValue) }),
      pattern: '^-?[0-9]+$',
    }),
    (value) => {
      const decoded = Number(value)

      return Number.isSafeInteger(decoded) && decoded >= minimum && decoded <= maximum
    },
  )

  return Type.Decode(encoded, Number)
}
