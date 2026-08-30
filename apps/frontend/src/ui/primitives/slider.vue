<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { computed } from 'vue'

withDefaults(
  defineProps<{
    accessibleLabel: string
    max?: number
    min?: number
    step?: number
  }>(),
  { max: 100, min: 0, step: 1 },
)

const model = defineModel<number>({ required: true })

const sliderValue = computed<number[]>({
  get: () => [model.value],
  set: (value) => {
    if (value[0] != null) {
      model.value = value[0]
    }
  },
})
</script>

<template>
  <SliderRoot v-model="sliderValue" class="app-slider" :max="max" :min="min" :step="step">
    <SliderTrack class="app-slider__track">
      <SliderRange class="app-slider__range" />
    </SliderTrack>
    <SliderThumb class="app-slider__thumb" :aria-label="accessibleLabel" />
  </SliderRoot>
</template>

<style scoped>
.app-slider {
  position: relative;
  display: flex;
  width: 100%;
  height: var(--size-control-sm);
  align-items: center;
  touch-action: none;
  user-select: none;
}

.app-slider__track {
  position: relative;
  height: var(--space-1);
  flex: 1;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-surface-inset);
}

.app-slider__range {
  position: absolute;
  height: 100%;
  background: var(--color-accent-emphasis);
}

.app-slider__thumb {
  display: block;
  width: var(--space-4);
  height: var(--space-4);
  border: var(--stroke-default) solid var(--color-border-strong);
  border-radius: var(--radius-full);
  background: var(--color-content-primary);
  cursor: grab;
}

.app-slider__thumb:active {
  cursor: grabbing;
}

.app-slider__thumb:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}
</style>
