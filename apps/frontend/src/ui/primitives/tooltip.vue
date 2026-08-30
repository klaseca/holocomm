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
  z-index: var(--layer-tooltip);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  color: var(--color-tooltip-foreground);
  background: var(--color-tooltip-background);
  box-shadow: 0 var(--space-2) var(--space-6) var(--color-shadow);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-compact);
  white-space: nowrap;
}

.app-tooltip__arrow {
  fill: var(--color-tooltip-background);
}
</style>
