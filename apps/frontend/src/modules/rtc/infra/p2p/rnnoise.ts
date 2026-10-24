import type { RnnoiseWorkletNode } from '@sapphi-red/web-noise-suppressor'
import wasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url'
import simdWasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url'
import workletUrl from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url'

let wasmBinary: Promise<ArrayBuffer> | undefined

export class Rnnoise {
  private context: AudioContext | undefined

  private source: MediaStreamAudioSourceNode | undefined

  private processor: RnnoiseWorkletNode | undefined

  private destination: MediaStreamAudioDestinationNode | undefined

  private generation = 0

  private failed = false

  static get isSupported(): boolean {
    return typeof AudioContext !== 'undefined'
      && 'audioWorklet' in AudioContext.prototype
      && typeof AudioWorkletNode !== 'undefined'
      && typeof WebAssembly !== 'undefined'
  }

  get hasFailed(): boolean {
    return this.failed
  }

  get stream(): MediaStream | undefined {
    return this.destination?.stream
  }

  async start(stream: MediaStream, onError: () => void): Promise<MediaStream> {
    this.stop()

    const generation = this.generation

    try {
      if (this.failed) {
        throw new Error('RNNoise has failed in this microphone session')
      }

      if (stream.getAudioTracks()[0]?.getSettings().noiseSuppression === true) {
        throw new Error('Browser noise suppression must be disabled before RNNoise starts')
      }

      const { loadRnnoise, RnnoiseWorkletNode } = await import('@sapphi-red/web-noise-suppressor')

      wasmBinary ??= loadRnnoise({ url: wasmUrl, simdUrl: simdWasmUrl })
        .then(async (binary) => {
          // Detect compilation/CSP failures before handing audio to the worklet.
          await WebAssembly.compile(binary)

          return binary
        })
        .catch((error) => {
          wasmBinary = undefined
          throw error
        })

      const binary = await wasmBinary

      this.checkCurrent(generation)
      this.context = new AudioContext({ sampleRate: 48_000 })
      await Promise.all([
        this.context.resume(),
        this.context.audioWorklet.addModule(workletUrl),
      ])
      this.checkCurrent(generation)

      if (this.context.sampleRate !== 48_000 || this.context.state !== 'running') {
        throw new Error('RNNoise requires a running 48 kHz audio context')
      }

      this.processor = new RnnoiseWorkletNode(this.context, {
        maxChannels: 1,
        wasmBinary: binary,
      })
      this.processor.channelCount = 1
      this.processor.channelCountMode = 'explicit'
      this.processor.addEventListener('processorerror', () => {
        if (generation !== this.generation) {
          return
        }

        this.failed = true
        this.stop()
        onError()
      }, { once: true })
      this.source = this.context.createMediaStreamSource(stream)
      this.destination = new MediaStreamAudioDestinationNode(this.context, {
        channelCount: 1,
        channelCountMode: 'explicit',
      })
      this.source.connect(this.processor)
      this.processor.connect(this.destination)

      return this.destination.stream
    } catch (error) {
      if (generation === this.generation) {
        this.failed = true
        this.stop()
      }

      throw error
    }
  }

  stop(): void {
    ++this.generation
    this.source?.disconnect()
    this.processor?.destroy()
    this.processor?.disconnect()
    this.destination?.stream.getTracks().forEach(track => track.stop())

    if (this.context !== undefined && this.context.state !== 'closed') {
      void this.context.close().catch(() => undefined)
    }

    this.source = undefined
    this.processor = undefined
    this.destination = undefined
    this.context = undefined
  }

  private checkCurrent(generation: number): void {
    if (generation !== this.generation) {
      throw new DOMException('Noise suppression was stopped', 'AbortError')
    }
  }
}
