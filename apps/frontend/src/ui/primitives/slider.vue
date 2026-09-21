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
  height: var(--control-medium-size);
  align-items: center;
  touch-action: none;
  user-select: none;
}

.app-slider__track {
  position: relative;
  height: var(--base-size-4);
  flex: 1;
  overflow: hidden;
  border-radius: var(--border-radius-full);
  background: var(--bg-color-inset);
}

.app-slider__range {
  position: absolute;
  height: 100%;
  background: var(--bg-color-accent-emphasis);
}

.app-slider__thumb {
  display: block;
  width: var(--base-size-16);
  height: var(--base-size-16);
  border: var(--border-width-thin) solid var(--border-color-emphasis);
  border-radius: var(--border-radius-full);
  background: var(--fg-color-default);
  cursor: grab;
}

.app-slider__thumb:active {
  cursor: grabbing;
}
</style>
