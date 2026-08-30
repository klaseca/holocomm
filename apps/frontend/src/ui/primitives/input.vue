<script setup lang="ts">
import { useAttrs, useId } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  error?: string
  label?: string
}>()

const model = defineModel<string>({ default: '' })

const attrs = useAttrs()

const generatedId = useId()

const inputId = typeof attrs.id === 'string' ? attrs.id : generatedId
</script>

<template>
  <label class="field" :for="inputId">
    <span v-if="label" class="field__label">{{ label }}</span>
    <input
      v-bind="attrs"
      :id="inputId"
      v-model="model"
      class="field__control"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :aria-invalid="error ? true : undefined"
    />
    <span v-if="error" :id="`${inputId}-error`" class="field__error">{{ error }}</span>
  </label>
</template>

<style scoped>
.field {
  display: grid;
  gap: var(--space-2);
  color: var(--color-content-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.field__control {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--size-control-md);
  border: var(--stroke-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding-inline: var(--space-3);
  color: var(--color-content-primary);
  background: var(--color-surface-inset);
  font: inherit;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.field__control::placeholder {
  color: var(--color-content-secondary);
}

.field__control:focus-visible {
  border-color: var(--color-focus);
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.field__error {
  color: var(--color-status-danger);
}
</style>
