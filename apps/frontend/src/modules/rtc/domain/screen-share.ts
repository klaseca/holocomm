export type ScreenShareState = 'off' | 'requesting' | 'sharing' | 'denied' | 'error'

export class ScreenShareError extends Error {
  readonly reason: 'denied' | 'unavailable'

  constructor(reason: 'denied' | 'unavailable', message: string) {
    super(message)
    this.name = 'ScreenShareError'
    this.reason = reason
  }
}
