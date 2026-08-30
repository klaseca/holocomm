import { describe, expect, test } from 'vitest'

import { loadRuntimeConfig } from './runtime-config.ts'

describe('loadRuntimeConfig', () => {
  test('loads validated runtime configuration', async () => {
    const runtimeConfig = {
      webSocketUrl: 'wss://holocomm.example/ws',
      iceServers: ['stun:one.example', 'turns:two.example:5349'],
    }

    const fetchConfig = async () => new Response(JSON.stringify(runtimeConfig))

    await expect(loadRuntimeConfig(fetchConfig)).resolves.toEqual(runtimeConfig)
  })

  test('rejects invalid runtime configuration', async () => {
    const fetchConfig = async () => new Response(JSON.stringify({
      webSocketUrl: '/ws',
      iceServers: ['https://ice.example'],
    }))

    await expect(loadRuntimeConfig(fetchConfig)).rejects.toThrow(
      'invalid runtime configuration',
    )
  })
})
