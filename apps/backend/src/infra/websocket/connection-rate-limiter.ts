export type RateLimitDecision = 'allowed' | 'rejected' | 'rejected-silently'

interface RateWindow {
  count: number
  rejectionSent: boolean
  startedAt: number
}

export class ConnectionRateLimiter {
  private readonly maxMessages: number

  private readonly now: () => number

  private readonly windowMs: number

  private readonly windows = new Map<string, RateWindow>()

  constructor(maxMessages: number, windowMs: number, now: () => number = Date.now) {
    this.maxMessages = maxMessages
    this.windowMs = windowMs
    this.now = now
  }

  check(connectionId: string): RateLimitDecision {
    const currentTime = this.now()

    let window = this.windows.get(connectionId)

    if (window === undefined || currentTime - window.startedAt >= this.windowMs) {
      window = { count: 0, rejectionSent: false, startedAt: currentTime }

      this.windows.set(connectionId, window)
    }

    if (window.count < this.maxMessages) {
      window.count += 1

      return 'allowed'
    }

    if (!window.rejectionSent) {
      window.rejectionSent = true

      return 'rejected'
    }

    return 'rejected-silently'
  }

  remove(connectionId: string): void {
    this.windows.delete(connectionId)
  }
}
