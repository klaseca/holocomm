<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  label: string
  muted: boolean
  stream: MediaStream
  volume: number
}>()

const video = useTemplateRef<HTMLVideoElement>('video')

function attachStream(): void {
  if (video.value !== null) {
    video.value.srcObject = props.stream
  }
}

onMounted(attachStream)
watch(() => props.stream, attachStream)
onBeforeUnmount(() => {
  if (video.value !== null) {
    video.value.srcObject = null
  }
})
</script>

<template>
  <figure class="remote-screen">
    <video
      ref="video"
      :aria-label="label"
      autoplay
      controls
      :muted="muted"
      playsinline
      :volume="volume"
    />
    <figcaption>{{ label }}</figcaption>
  </figure>
</template>

<style scoped>
.remote-screen {
  position: relative;
  display: grid;
  aspect-ratio: 16 / 9;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-large);
  background: var(--bg-color-muted);
}

video {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--bg-color-inset);
  object-fit: contain;
}

figcaption {
  position: absolute;
  right: var(--base-size-12);
  bottom: var(--base-size-12);
  border-radius: var(--border-radius-default);
  padding: var(--base-size-4) var(--base-size-8);
  background: var(--overlay-bg-color);
  color: var(--fg-color-default);
  font-size: var(--text-body-size-medium);
}
</style>
