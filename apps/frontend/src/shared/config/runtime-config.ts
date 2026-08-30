import Type from 'typebox'
import { Check } from 'typebox/value'

const RuntimeConfigSchema = Type.Object({
  webSocketUrl: Type.String({ minLength: 1, pattern: '^wss?://' }),
  iceServers: Type.Array(
    Type.String({ pattern: '^(?:stun|stuns|turn|turns):\\S+$' }),
    { minItems: 1 },
  ),
})

export type RuntimeConfig = Type.Static<typeof RuntimeConfigSchema>

export async function loadRuntimeConfig(
  fetchConfig: typeof fetch = globalThis.fetch,
): Promise<RuntimeConfig> {
  const response = await fetchConfig('/api/config', { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Could not load runtime configuration (${response.status})`)
  }

  const config: unknown = await response.json()

  if (!Check(RuntimeConfigSchema, config)) {
    throw new Error('The server returned an invalid runtime configuration')
  }

  return config
}
