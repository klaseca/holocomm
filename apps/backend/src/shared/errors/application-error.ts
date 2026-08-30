export type ApplicationErrorCode
  = | 'INVALID_MESSAGE'
    | 'INVALID_ROOM_NAME'
    | 'INVALID_DISPLAY_NAME'
    | 'ROOM_FULL'
    | 'ROOM_NOT_FOUND'
    | 'MESSAGE_TOO_LONG'
    | 'RTC_PEER_LIMIT'
    | 'RTC_SIGNAL_INVALID'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR'

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode

  constructor(code: ApplicationErrorCode, message: string) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
  }
}
