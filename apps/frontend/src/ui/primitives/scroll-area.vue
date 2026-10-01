<script setup lang="ts">
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from 'reka-ui'

defineProps<{
  accessibleLabel: string
}>()
</script>

<template>
  <ScrollAreaRoot class="scroll-area" type="auto">
    <ScrollAreaViewport
      class="scroll-area__viewport"
      role="region"
      :aria-label="accessibleLabel"
    >
      <slot />
    </ScrollAreaViewport>
    <ScrollAreaScrollbar class="scroll-area__scrollbar" orientation="vertical">
      <ScrollAreaThumb class="scroll-area__thumb" />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>

<style scoped>
.scroll-area {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.scroll-area :deep(.scroll-area__viewport) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
}

.scroll-area :deep(.scroll-area__scrollbar) {
  display: flex;
  width: var(--layout-scrollbar);
  padding: var(--base-size-4);
  background: var(--bg-color-inset);
  touch-action: none;
  user-select: none;
}

.scroll-area :deep(.scroll-area__thumb) {
  position: relative;
  flex: 1;
  border-radius: var(--border-radius-full);
  background: var(--border-color-emphasis);
}
</style>
