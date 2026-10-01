import { nextTick, type Ref, watch } from 'vue'

export function useResponsiveDialog(
  dialog: Readonly<Ref<HTMLDialogElement | null>>,
  compact: Readonly<Ref<boolean>>,
  opened: Ref<boolean>,
  restoreFocus?: () => void,
) {
  watch([compact, opened], async () => {
    await nextTick()

    const element = dialog.value

    if (element == null) {
      return
    }

    if (!compact.value && opened.value) {
      opened.value = false
    }

    if (compact.value && opened.value) {
      if (!element.open) {
        element.showModal()
      }
    } else if (element.open) {
      element.close()
      restoreFocus?.()
    }
  }, { immediate: true, flush: 'post' })

  function cancel(event: Event): void {
    event.preventDefault()
    opened.value = false
  }

  function closeOnBackdrop(event: MouseEvent): void {
    if (event.target === dialog.value) {
      opened.value = false
    }
  }

  return { cancel, closeOnBackdrop }
}
