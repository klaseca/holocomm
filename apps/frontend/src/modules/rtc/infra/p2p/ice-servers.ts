const DEFAULT_STUN_URL = 'stun:stun.l.google.com:19302'

export function resolveIceServers(urls: readonly string[] | undefined): RTCIceServer[] {
  return [{ urls: urls != null && urls.length > 0 ? [...urls] : [DEFAULT_STUN_URL] }]
}
