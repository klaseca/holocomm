<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useId } from 'vue'

withDefaults(defineProps<{
  description?: string
  disabled?: boolean
  label: string
}>(), { disabled: false })

const model = defineModel<boolean>({ required: true })

const id = useId()
</script>

<template>
  <div class="switch-field" :data-disabled="disabled ? '' : undefined">
    <span class="switch-field__copy">
      <label :for="id">{{ label }}</label>
      <small v-if="description" :id="`${id}-description`">{{ description }}</small>
    </span>
    <SwitchRoot
      :id="id"
      v-model="model"
      :aria-describedby="description ? `${id}-description` : undefined"
      class="switch-field__control"
      :disabled="disabled"
    >
      <SwitchThumb class="switch-field__thumb" />
    </SwitchRoot>
  </div>
</template>

<style scoped>
.switch-field {
  display: flex;
  min-height: var(--control-large-size);
  align-items: center;
  justify-content: space-between;
  gap: var(--base-size-16);
}

.switch-field__copy {
  display: grid;
  min-width: 0;
  gap: var(--base-size-4);
}

.switch-field__copy label {
  color: var(--fg-color-default);
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  cursor: pointer;
}

.switch-field__copy small {
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-small);
  line-height: var(--text-body-line-height-medium);
}

.switch-field__control {
  display: flex;
  width: calc(var(--base-size-40) + var(--base-size-4));
  height: var(--base-size-24);
  flex: none;
  align-items: center;
  border: var(--border-width-thin) solid var(--control-track-border-color-rest);
  border-radius: var(--border-radius-full);
  padding: var(--base-size-4);
  background: var(--control-track-bg-color-rest);
  cursor: pointer;
  transition: background-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.switch-field__control:hover:not(:disabled):not([data-state='checked']) {
  background: var(--control-track-bg-color-hover);
}

.switch-field__control[data-state='checked'] {
  border-color: var(--control-checked-bg-color-rest);
  background: var(--control-checked-bg-color-rest);
}

.switch-field[data-disabled] label {
  color: var(--control-fg-color-disabled);
  cursor: not-allowed;
}

.switch-field__control:disabled {
  border-color: var(--control-bg-color-disabled);
  background: var(--control-bg-color-disabled);
  cursor: not-allowed;
}

.switch-field__thumb {
  display: block;
  width: var(--base-size-16);
  height: var(--base-size-16);
  border-radius: var(--border-radius-full);
  background: var(--control-knob-bg-color-rest);
  transform: translateX(0);
  transition: transform var(--motion-duration-micro) var(--motion-easing-hover);
}

.switch-field__thumb[data-state='checked'] {
  background: var(--control-knob-bg-color-checked);
  transform: translateX(calc(var(--base-size-16) + var(--base-size-4)));
}

.switch-field__control:disabled .switch-field__thumb {
  background: var(--control-fg-color-disabled);
}

@media (prefers-reduced-motion: reduce) {
  .switch-field__control,
  .switch-field__thumb {
    transition: none;
  }
}
</style>
