<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useId } from 'vue'

defineProps<{
  description?: string
  label: string
}>()

const model = defineModel<boolean>({ required: true })

const id = useId()
</script>

<template>
  <div class="switch-field">
    <span class="switch-field__copy">
      <label :for="id">{{ label }}</label>
      <small v-if="description">{{ description }}</small>
    </span>
    <SwitchRoot :id="id" v-model="model" class="switch-field__control">
      <SwitchThumb class="switch-field__thumb" />
    </SwitchRoot>
  </div>
</template>

<style scoped>
.switch-field {
  display: flex;
  min-height: var(--size-control-md);
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.switch-field__copy {
  display: grid;
  gap: var(--space-1);
}

.switch-field__copy label {
  color: var(--color-content-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.switch-field__copy small {
  color: var(--color-content-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-body);
}

.switch-field__control {
  display: flex;
  width: calc(var(--space-10) + var(--space-1));
  height: var(--space-6);
  flex: none;
  align-items: center;
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-full);
  padding: var(--space-1);
  background: var(--color-surface-inset);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.switch-field__control[data-state='checked'] {
  border-color: var(--color-accent-emphasis);
  background: var(--color-accent-emphasis);
}

.switch-field__control:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.switch-field__thumb {
  display: block;
  width: var(--space-4);
  height: var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-control-thumb);
  transform: translateX(0);
  transition: transform var(--duration-fast) var(--ease-out);
}

.switch-field__thumb[data-state='checked'] {
  transform: translateX(calc(var(--space-4) + var(--space-1)));
}

@media (prefers-reduced-motion: reduce) {
  .switch-field__control,
  .switch-field__thumb {
    transition: none;
  }
}
</style>
