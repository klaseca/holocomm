<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

withDefaults(
  defineProps<{
    side?: 'top' | 'right' | 'bottom' | 'left'
    text: string
  }>(),
  { side: 'top' },
)
</script>

<template>
  <TooltipProvider>
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent class="app-tooltip" :side="side" :side-offset="8">
          {{ text }}
          <TooltipArrow class="app-tooltip__arrow" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style>
.app-tooltip {
  z-index: var(--z-index-popover);
  border-radius: var(--border-radius-medium);
  padding: var(--base-size-8) var(--base-size-12);
  color: var(--tooltip-fg-color);
  background: var(--tooltip-bg-color);
  box-shadow: var(--shadow-floating-small);
  font-size: var(--text-body-size-medium);
  line-height: var(--base-text-line-height-tight);
  white-space: nowrap;
}

.app-tooltip__arrow {
  fill: var(--tooltip-bg-color);
}
</style>
