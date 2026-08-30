import type { RtcSignalEvent, RtcSignalPayload } from '@holocomm/protocol'

import { ApplicationError } from '#/shared/errors/application-error.ts'

export interface RtcPeerDirectory {
  resolvePeer: (connectionId: string, targetPeerId: string) => {
    readonly sourcePeerId: string
    readonly targetConnectionId: string
  } | undefined
}

export interface RtcSignalRoute {
  readonly targetConnectionId: string
  readonly message: RtcSignalEvent
}

export class RtcSignalingService {
  private readonly peers: RtcPeerDirectory

  constructor(peers: RtcPeerDirectory) {
    this.peers = peers
  }

  route(
    sourceConnectionId: string,
    targetPeerId: string,
    payload: RtcSignalPayload,
  ): RtcSignalRoute {
    const peer = this.peers.resolvePeer(sourceConnectionId, targetPeerId)

    if (peer === undefined) {
      throw new ApplicationError('RTC_SIGNAL_INVALID', 'RTC signal target is not in the same room')
    }

    return {
      targetConnectionId: peer.targetConnectionId,
      message: { type: 'rtc.signal', sourcePeerId: peer.sourcePeerId, payload },
    }
  }
}
