import {
  isValidDisplayName,
  normalizeDisplayName as normalizeDisplayNameValue,
} from '@holocomm/protocol'

import { ApplicationError } from '#/shared/errors/application-error.ts'

export interface GuestIdentity {
  readonly participantId: string
  readonly sessionId: string
  readonly displayName: string
}

export function normalizeDisplayName(value: string): string {
  const displayName = normalizeDisplayNameValue(value)

  if (!isValidDisplayName(displayName)) {
    throw new ApplicationError('INVALID_DISPLAY_NAME', 'Display name must be 1–32 characters')
  }

  return displayName
}

export function createGuestIdentity(displayName: string): GuestIdentity {
  return {
    participantId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    displayName: normalizeDisplayName(displayName),
  }
}
