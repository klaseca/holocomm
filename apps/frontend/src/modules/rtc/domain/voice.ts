export type MicrophoneState = 'off' | 'requesting' | 'enabled' | 'muted' | 'denied' | 'error'

export class MicrophoneAccessError extends Error {
  readonly reason: 'denied' | 'unavailable'

  constructor(reason: 'denied' | 'unavailable', message: string) {
    super(message)
    this.name = 'MicrophoneAccessError'
    this.reason = reason
  }
}
