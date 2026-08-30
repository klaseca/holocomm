import { describe, expect, test } from 'vitest'

import { ClientRtcController } from './application/client-rtc-controller.ts'
import { createRtcController } from './create-rtc-controller.ts'

describe('createRtcController', () => {
  test('composes the supported P2P adapter behind the RTC controller', () => {
    expect(createRtcController({ signaling: { send: () => true } }))
      .toBeInstanceOf(ClientRtcController)
  })

  test('fails fast for an unavailable adapter', () => {
    expect(() => createRtcController({
      mode: 'sfu',
      signaling: { send: () => true },
    })).toThrow('RTC mode "sfu" is not implemented yet')
  })
})
