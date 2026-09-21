<script setup lang="ts">
withDefaults(
  defineProps<{
    disabled?: boolean
    nativeType?: 'button' | 'submit' | 'reset'
    size?: 'sm' | 'md' | 'lg'
    variant?: 'primary' | 'secondary' | 'danger'
  }>(),
  {
    disabled: false,
    nativeType: 'button',
    size: 'md',
    variant: 'primary',
  },
)
</script>

<template>
  <button
    class="button"
    :class="[`button--${variant}`, `button--${size}`]"
    :disabled="disabled"
    :type="nativeType"
  >
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--base-size-8);
  border: var(--border-width-thin) solid;
  border-radius: var(--border-radius-default);
  padding-inline: var(--base-size-16);
  font: inherit;
  font-size: var(--text-body-size-medium);
  font-weight: var(--base-text-weight-semibold);
  cursor: pointer;
  transition:
    color var(--motion-duration-micro) var(--motion-easing-hover),
    background-color var(--motion-duration-micro) var(--motion-easing-hover),
    border-color var(--motion-duration-micro) var(--motion-easing-hover);
}

.button:disabled {
  border-color: var(--control-bg-color-disabled);
  color: var(--control-fg-color-disabled);
  background: var(--control-bg-color-disabled);
  cursor: not-allowed;
}

.button--sm {
  min-height: var(--control-medium-size);
  padding-inline: var(--base-size-12);
}

.button--md {
  min-height: var(--control-large-size);
}

.button--lg {
  min-height: var(--control-xlarge-size);
  padding-inline: var(--base-size-20);
  font-size: var(--text-body-size-large);
}

.button--primary {
  border-color: var(--button-primary-bg-color-rest);
  color: var(--button-primary-fg-color-rest);
  background: var(--button-primary-bg-color-rest);
}

.button--primary:hover:not(:disabled) {
  border-color: var(--button-primary-bg-color-hover);
  background: var(--button-primary-bg-color-hover);
}

.button--primary:active:not(:disabled) {
  border-color: var(--button-primary-bg-color-active);
  background: var(--button-primary-bg-color-active);
}

.button--secondary {
  border-color: var(--border-color-default);
  color: var(--button-default-fg-color-rest);
  background: var(--button-default-bg-color-rest);
}

.button--secondary:hover:not(:disabled) {
  background: var(--button-default-bg-color-hover);
}

.button--secondary:active:not(:disabled) {
  background: var(--button-default-bg-color-active);
}

.button--danger {
  border-color: var(--border-color-default);
  color: var(--button-danger-fg-color-rest);
  background: var(--button-danger-bg-color-rest);
}

.button--danger:hover:not(:disabled) {
  border-color: var(--button-danger-bg-color-hover);
  color: var(--button-danger-fg-color-hover);
  background: var(--button-danger-bg-color-hover);
}

.button--danger:active:not(:disabled) {
  border-color: var(--button-danger-bg-color-active);
  color: var(--button-danger-fg-color-active);
  background: var(--button-danger-bg-color-active);
}
</style>
