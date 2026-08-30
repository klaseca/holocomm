import { ClientRtcController } from './application/client-rtc-controller.ts'
import type { RtcSignaling } from './application/rtc-signaling.ts'
import { resolveIceServers } from './infra/p2p/ice-servers.ts'
import { P2pSession } from './infra/p2p/p2p-session.ts'

export type RtcMode = 'p2p' | 'sfu'

export interface CreateRtcControllerOptions {
  readonly iceServers?: readonly string[]
  readonly mode?: string
  readonly signaling: RtcSignaling
}

export function createRtcController(options: CreateRtcControllerOptions): ClientRtcController {
  const mode = options.mode ?? 'p2p'

  if (mode !== 'p2p') {
    const suffix = mode === 'sfu' ? 'is not implemented yet' : 'is not recognized'

    throw new Error(`RTC mode "${mode}" ${suffix}`)
  }

  return new ClientRtcController(
    new P2pSession(options.signaling, { iceServers: resolveIceServers(options.iceServers) }),
  )
}
