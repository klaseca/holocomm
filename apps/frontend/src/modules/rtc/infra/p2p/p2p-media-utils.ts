export interface P2pMediaPeer {
  microphoneSender?: RTCRtpSender
  screenSender?: RTCRtpSender
  screenAudioSender?: RTCRtpSender
}

export async function applySenderBitrate(
  sender: RTCRtpSender | undefined,
  maxBitrate: number,
  degradationPreference?: RTCDegradationPreference,
): Promise<void> {
  if (
    sender == null
    || typeof sender.getParameters !== 'function'
    || typeof sender.setParameters !== 'function'
  ) {
    return
  }

  const parameters = sender.getParameters()

  if (parameters.encodings.length === 0) {
    return
  }

  parameters.encodings[0].maxBitrate = maxBitrate

  if (degradationPreference != null) {
    parameters.degradationPreference = degradationPreference
  }

  await sender.setParameters(parameters)
}

export async function applyTrackConstraints(
  track: MediaStreamTrack,
  constraints: MediaTrackConstraints,
): Promise<void> {
  if (typeof track.applyConstraints === 'function') {
    await track.applyConstraints(constraints)
  }
}

export function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop()
  }
}
