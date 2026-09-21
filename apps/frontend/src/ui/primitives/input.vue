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
  gap: var(--base-size-8);
  color: var(--fg-color-muted);
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-medium);
}

.field__control {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--control-large-size);
  border: var(--border-width-thin) solid var(--border-color-default);
  border-radius: var(--border-radius-default);
  padding-inline: var(--base-size-12);
  color: var(--fg-color-default);
  background: var(--bg-color-default);
  font: inherit;
  transition: border-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.field__control::placeholder {
  color: var(--fg-color-muted);
}

.field__error {
  color: var(--fg-color-danger);
}
</style>
