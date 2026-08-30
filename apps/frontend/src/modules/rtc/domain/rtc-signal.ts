export type RtcSignal
  = | { readonly kind: 'offer', readonly sdp: string }
    | { readonly kind: 'answer', readonly sdp: string }
    | {
      readonly kind: 'ice-candidate'
      readonly candidate: string
      readonly sdpMid: string | null
      readonly sdpMLineIndex: number | null
      readonly usernameFragment?: string | null
    }

export type RtcPeerState = 'connecting' | 'connected' | 'disconnected' | 'failed'
