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
  gap: var(--space-2);
  border: var(--stroke-default) solid;
  border-radius: var(--radius-md);
  padding-inline: var(--space-4);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.button:focus-visible {
  outline: var(--stroke-focus) solid var(--color-focus);
  outline-offset: var(--stroke-focus-offset);
}

.button:disabled {
  border-color: var(--color-action-disabled-background);
  color: var(--color-action-disabled-foreground);
  background: var(--color-action-disabled-background);
  cursor: not-allowed;
}

.button--sm {
  min-height: var(--size-control-sm);
  padding-inline: var(--space-3);
}

.button--md {
  min-height: var(--size-control-md);
}

.button--lg {
  min-height: var(--size-control-lg);
  padding-inline: var(--space-5);
  font-size: var(--font-size-md);
}

.button--primary {
  border-color: var(--color-action-primary-background-rest);
  color: var(--color-action-primary-foreground);
  background: var(--color-action-primary-background-rest);
}

.button--primary:hover:not(:disabled) {
  border-color: var(--color-action-primary-background-hover);
  background: var(--color-action-primary-background-hover);
}

.button--primary:active:not(:disabled) {
  border-color: var(--color-action-primary-background-active);
  background: var(--color-action-primary-background-active);
}

.button--secondary {
  border-color: var(--color-border-default);
  color: var(--color-action-neutral-foreground);
  background: var(--color-action-neutral-background-rest);
}

.button--secondary:hover:not(:disabled) {
  background: var(--color-action-neutral-background-hover);
}

.button--danger {
  border-color: var(--color-action-danger-background-rest);
  color: var(--color-action-danger-foreground);
  background: var(--color-action-danger-background-rest);
}

.button--danger:hover:not(:disabled) {
  border-color: var(--color-action-danger-background-hover);
  background: var(--color-action-danger-background-hover);
}

.button--danger:active:not(:disabled) {
  border-color: var(--color-action-danger-background-active);
  background: var(--color-action-danger-background-active);
}
</style>
