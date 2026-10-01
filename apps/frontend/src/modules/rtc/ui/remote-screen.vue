<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { Dialog, IconButton } from '#/ui/primitives'

const props = defineProps<{
  label: string
  muted: boolean
  stream: MediaStream
  volume: number
}>()

const video = useTemplateRef<HTMLVideoElement>('video')

const expanded = ref(false)

function attachStream(): void {
  if (video.value !== null) {
    video.value.srcObject = props.stream
  }
}

onMounted(attachStream)
watch([() => props.stream, expanded], async () => {
  await nextTick()
  attachStream()
})
onBeforeUnmount(() => {
  if (video.value !== null) {
    video.value.srcObject = null
  }
})
</script>

<template>
  <figure class="remote-screen">
    <video
      v-if="!expanded"
      ref="video"
      :aria-label="label"
      autoplay
      controls
      :muted="muted"
      playsinline
      :volume="volume"
    />
    <figcaption>{{ label }}</figcaption>
    <IconButton class="remote-screen__expand" :label="`Expand ${label}`" @click="expanded = true">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
      </svg>
    </IconButton>
    <Dialog
      v-model="expanded"
      content-class="expanded-screen-dialog"
      description="Expanded live screen share. Use the video controls to adjust volume."
      size="lg"
      :title="label"
    >
      <video
        v-if="expanded"
        ref="video"
        :aria-label="label"
        autoplay
        controls
        :muted="muted"
        playsinline
        :volume="volume"
      />
    </Dialog>
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
  top: var(--base-size-8);
  left: var(--base-size-8);
  max-width: calc(100% - var(--base-size-64));
  overflow-wrap: anywhere;
  border-radius: var(--border-radius-default);
  padding: var(--base-size-4) var(--base-size-8);
  background: var(--overlay-bg-color);
  color: var(--fg-color-default);
  font-size: var(--text-body-size-medium);
}

.remote-screen__expand {
  position: absolute;
  top: var(--base-size-8);
  right: var(--base-size-8);
  width: var(--base-size-44);
  height: var(--base-size-44);
}
</style>

<style>
.expanded-screen-dialog .dialog__body {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.expanded-screen-dialog video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--bg-color-inset);
}
</style>
