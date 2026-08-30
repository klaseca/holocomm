<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  muted: boolean
  stream: MediaStream
  volume: number
}>()

const audio = useTemplateRef<HTMLAudioElement>('audio')

let waitingForPlaybackGesture = false

function syncAudio(): void {
  const element = audio.value

  if (element === null) {
    return
  }

  element.srcObject = props.stream
  element.muted = props.muted
  element.volume = Math.min(1, Math.max(0, props.volume))
  startPlayback(element)
}

function startPlayback(element: HTMLAudioElement): void {
  element.play()
    .then(clearPlaybackGestureListeners)
    .catch((error) => {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        waitForPlaybackGesture()
      }
    })
}

function waitForPlaybackGesture(): void {
  if (waitingForPlaybackGesture) {
    return
  }

  waitingForPlaybackGesture = true
  window.addEventListener('pointerdown', retryPlayback)
  window.addEventListener('keydown', retryPlayback)
}

function retryPlayback(): void {
  clearPlaybackGestureListeners()
  syncAudio()
}

function clearPlaybackGestureListeners(): void {
  if (!waitingForPlaybackGesture) {
    return
  }

  waitingForPlaybackGesture = false
  window.removeEventListener('pointerdown', retryPlayback)
  window.removeEventListener('keydown', retryPlayback)
}

onMounted(syncAudio)
watch(() => [props.stream, props.muted, props.volume], syncAudio)
onBeforeUnmount(() => {
  clearPlaybackGestureListeners()

  if (audio.value !== null) {
    audio.value.pause()
    audio.value.srcObject = null
  }
})
</script>

<template>
  <audio ref="audio" autoplay hidden playsinline />
</template>
