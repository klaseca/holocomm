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
    <video ref="video" autoplay controls :muted="muted" playsinline :volume="volume" />
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
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-surface-panel);
}

video {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--color-surface-inset);
  object-fit: contain;
}

figcaption {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface-elevated);
  color: var(--color-content-primary);
  font-size: var(--font-size-sm);
}
</style>
