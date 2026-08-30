import { onBeforeUnmount, readonly, ref, watch, type WatchSource } from 'vue'

interface VoiceInput {
  readonly analyser: AnalyserNode
  readonly samples: Uint8Array<ArrayBuffer>
  readonly source: MediaStreamAudioSourceNode
  readonly stream: MediaStream
  speakingUntil: number
}

const SPEAKING_THRESHOLD = 0.035

const SPEAKING_HOLD_MS = 180

export function useVoiceActivity(
  streams: WatchSource<Readonly<Record<string, MediaStream>>>,
) {
  const speakingIds = ref<ReadonlySet<string>>(new Set())

  const inputs = new Map<string, VoiceInput>()

  let audioContext: AudioContext | undefined

  let animationFrame: number | undefined

  function ensureAudioContext(): AudioContext {
    audioContext ??= new AudioContext()

    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => undefined)
    }

    return audioContext
  }

  function removeInput(id: string): void {
    const input = inputs.get(id)

    if (input === undefined) {
      return
    }

    input.source.disconnect()
    input.analyser.disconnect()
    inputs.delete(id)
  }

  function syncInputs(nextStreams: Readonly<Record<string, MediaStream>>): void {
    for (const [id, input] of inputs) {
      if (nextStreams[id] !== input.stream) {
        removeInput(id)
      }
    }

    for (const [id, stream] of Object.entries(nextStreams)) {
      if (inputs.has(id) || stream.getAudioTracks().length === 0) {
        continue
      }

      try {
        const context = ensureAudioContext()

        const analyser = context.createAnalyser()

        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.35

        const source = context.createMediaStreamSource(stream)

        source.connect(analyser)
        inputs.set(id, {
          analyser,
          samples: new Uint8Array(analyser.fftSize),
          source,
          speakingUntil: 0,
          stream,
        })
      } catch {
        // A missing or inaccessible audio track should not break the room UI.
      }
    }

    if (inputs.size > 0 && animationFrame === undefined) {
      animationFrame = requestAnimationFrame(sampleActivity)
    }

    if (inputs.size === 0) {
      updateSpeakingIds(new Set())
    }
  }

  function sampleActivity(now: number): void {
    animationFrame = undefined

    const nextSpeakingIds = new Set<string>()

    for (const [id, input] of inputs) {
      input.analyser.getByteTimeDomainData(input.samples)

      let sumOfSquares = 0

      for (const sample of input.samples) {
        const normalized = (sample - 128) / 128

        sumOfSquares += normalized * normalized
      }

      const volume = Math.sqrt(sumOfSquares / input.samples.length)

      if (volume >= SPEAKING_THRESHOLD) {
        input.speakingUntil = now + SPEAKING_HOLD_MS
      }

      if (input.speakingUntil > now) {
        nextSpeakingIds.add(id)
      }
    }

    updateSpeakingIds(nextSpeakingIds)

    if (inputs.size > 0) {
      animationFrame = requestAnimationFrame(sampleActivity)
    }
  }

  function updateSpeakingIds(next: ReadonlySet<string>): void {
    const current = speakingIds.value

    if (current.size === next.size && [...current].every(id => next.has(id))) {
      return
    }

    speakingIds.value = next
  }

  const stopWatching = watch(streams, syncInputs, { immediate: true })

  onBeforeUnmount(() => {
    stopWatching()

    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame)
    }

    for (const id of [...inputs.keys()]) {
      removeInput(id)
    }
    void audioContext?.close()
  })

  return readonly(speakingIds)
}
