export function isSupportsOwnAudioRestriction(track?: MediaStreamTrack): boolean {
  const supported = 'restrictOwnAudio' in (
    globalThis.navigator?.mediaDevices?.getSupportedConstraints?.() ?? {}
  )

  if (!supported || track === undefined) {
    return supported
  }

  const capabilities = track.getCapabilities()

  return 'restrictOwnAudio' in capabilities
    && Array.isArray(capabilities.restrictOwnAudio)
    && capabilities.restrictOwnAudio.includes(true)
}
