import type { ServerMessage } from '@holocomm/protocol'

export interface WebSocketConnection {
  readonly id: string
  send: (message: ServerMessage) => void
  close: (code?: number, reason?: string) => void
}
