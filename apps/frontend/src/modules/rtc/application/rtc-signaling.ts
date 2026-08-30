import type { RtcSignal } from '../domain/rtc-signal.ts'

export interface RtcSignaling {
  send: (targetPeerId: string, payload: RtcSignal) => boolean
}
