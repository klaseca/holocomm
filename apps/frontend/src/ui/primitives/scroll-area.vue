<script setup lang="ts">
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from 'reka-ui'
</script>

<template>
  <ScrollAreaRoot class="scroll-area" type="auto">
    <ScrollAreaViewport class="scroll-area__viewport">
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

.scroll-area__viewport {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.scroll-area__scrollbar {
  display: flex;
  width: var(--layout-scrollbar);
  padding: var(--space-1);
  background: var(--color-surface-inset);
  touch-action: none;
  user-select: none;
}

.scroll-area__thumb {
  position: relative;
  flex: 1;
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
}
</style>
